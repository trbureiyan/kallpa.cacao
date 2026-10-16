from collections import defaultdict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import CostEntry, Farm, Lot, Producer, Transformation, TransformationOutput
from app.services.alerts import build_alerts
from app.services.economics import summarize_cost


def dashboard_analytics(db: Session) -> dict:
    output_totals = (db.query(
        TransformationOutput.transformation_id.label("transformation_id"),
        func.sum(Lot.received_quantity).label("output_quantity"),
    ).join(Lot, Lot.id == TransformationOutput.lot_id)
      .group_by(TransformationOutput.transformation_id).subquery())

    rows = (db.query(Transformation, Lot, Producer, Farm, output_totals.c.output_quantity)
            .join(Lot, Lot.id == Transformation.lot_id)
            .join(Producer, Producer.id == Lot.producer_id)
            .outerjoin(Farm, Farm.id == Lot.farm_id)
            .outerjoin(output_totals, output_totals.c.transformation_id == Transformation.id)
            .all())

    by_origin = defaultdict(lambda: {"input_kg": 0.0, "loss_kg": 0.0, "transformations": 0})
    by_producer = defaultdict(lambda: {"input_kg": 0.0, "loss_kg": 0.0, "transformations": 0})
    for transform, lot, producer, farm, output_quantity in rows:
        received = float(transform.input_quantity)
        produced = float(output_quantity or 0)
        loss = max(received - produced, 0.0)
        origin = farm.region if farm else lot.origin
        for key, bucket in ((origin, by_origin), (producer.name, by_producer)):
            bucket[key]["input_kg"] += received
            bucket[key]["loss_kg"] += loss
            bucket[key]["transformations"] += 1

    loss_rows = []
    for origin, values in by_origin.items():
        loss_rows.append({"origin": origin, **values,
                          "loss_percent": values["loss_kg"] / values["input_kg"] * 100 if values["input_kg"] else None})
    producer_rows = []
    for producer_name, values in by_producer.items():
        producer_rows.append({"producer": producer_name, **values,
                              "loss_percent": values["loss_kg"] / values["input_kg"] * 100 if values["input_kg"] else None})

    outputs_by_transformation = defaultdict(list)
    for transform_id, lot in (db.query(TransformationOutput.transformation_id, Lot)
                              .join(Lot, Lot.id == TransformationOutput.lot_id).all()):
        outputs_by_transformation[transform_id].append(lot)
    costs_by_transformation = defaultdict(lambda: {"amount": 0.0, "categories": set()})
    for transformation_id, category, amount in db.query(
        CostEntry.transformation_id, CostEntry.category, func.sum(CostEntry.amount_cop)
    ).filter(CostEntry.transformation_id.is_not(None)).group_by(
        CostEntry.transformation_id, CostEntry.category
    ).all():
        costs_by_transformation[transformation_id]["amount"] += float(amount)
        costs_by_transformation[transformation_id]["categories"].add(category)

    margins = []
    for transform in db.query(Transformation).order_by(Transformation.occurred_at.desc()).all():
        outputs = outputs_by_transformation[transform.id]
        quantity = sum(float(lot.received_quantity) for lot in outputs)
        cost_data = costs_by_transformation[transform.id]
        total_cost = cost_data["amount"]
        categories = sorted(cost_data["categories"])
        summary = summarize_cost(quantity, total_cost,
                                 float(transform.sale_price_cop_per_unit) if transform.sale_price_cop_per_unit is not None else None,
                                 categories)
        if summary["margin_on_sale_percent"] is not None:
            for lot in outputs:
                margins.append({"lot_code": lot.code, "stage": transform.stage,
                                "margin_on_sale_percent": summary["margin_on_sale_percent"],
                                "unit_cost_cop": summary["unit_cost_cop"],
                                "sale_price_cop_per_unit": float(transform.sale_price_cop_per_unit),
                                "unit": lot.unit})

    blocked_lots = db.query(Lot).filter_by(status="blocked").order_by(Lot.code).all()
    return {
        "loss_by_origin": sorted(loss_rows, key=lambda item: item["loss_kg"], reverse=True),
        "loss_by_producer": sorted(producer_rows, key=lambda item: item["loss_kg"], reverse=True),
        "lowest_margins": sorted(margins, key=lambda item: item["margin_on_sale_percent"])[:5],
        "blocked_lots": [{"code": lot.code, "origin": lot.origin, "reason": lot.status_reason,
                          "available_quantity": float(lot.available_quantity), "unit": lot.unit} for lot in blocked_lots],
        "open_alerts": build_alerts(db),
    }
