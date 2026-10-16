from sqlalchemy.orm import Session

from app.models import Lot, Producer, Transformation, TransformationOutput


def trace_lot(db: Session, lot_id: int):
    lot = db.get(Lot, lot_id)
    if not lot:
        return None

    # Walk back to the received lot(s), retaining every transformation edge.
    upstream = []
    roots = []
    visited_upstream = set()
    pending = [lot]
    while pending:
        current = pending.pop()
        if current.id in visited_upstream:
            continue
        visited_upstream.add(current.id)
        links = (
            db.query(TransformationOutput, Transformation)
            .join(Transformation, Transformation.id == TransformationOutput.transformation_id)
            .filter(TransformationOutput.lot_id == current.id)
            .all()
        )
        if not links:
            roots.append(current)
            continue
        for link, transform in links:
            input_lot = db.get(Lot, transform.lot_id)
            upstream.append({"transformation": transform, "input_lot": input_lot, "output_lot": current})
            if input_lot:
                pending.append(input_lot)

    # Walk forward from this lot to all descendants, even across multiple stages.
    downstream = []
    visited_downstream = set()
    pending_ids = [lot.id]
    while pending_ids:
        input_id = pending_ids.pop(0)
        if input_id in visited_downstream:
            continue
        visited_downstream.add(input_id)
        transforms = db.query(Transformation).filter_by(lot_id=input_id).order_by(Transformation.occurred_at).all()
        for transform in transforms:
            outputs = (
                db.query(Lot, TransformationOutput)
                .join(TransformationOutput, TransformationOutput.lot_id == Lot.id)
                .filter(TransformationOutput.transformation_id == transform.id)
                .all()
            )
            downstream.append({"transformation": transform, "input_lot": db.get(Lot, input_id),
                               "outputs": [{"lot": output, "quantity": link.quantity} for output, link in outputs]})
            pending_ids.extend(output.id for output, _ in outputs)

    # Each root preserves the original reception producer and farm origin.
    origin_lots = []
    for root in roots:
        producer = db.get(Producer, root.producer_id)
        origin_lots.append({"lot": root, "producer": producer})
    producer = db.get(Producer, lot.producer_id)
    direct_transformations = list({
        item["transformation"].id: item["transformation"]
        for item in upstream + downstream
    }.values())
    return {
        "lot": lot,
        "producer": producer,
        "origin_lots": origin_lots,
        "upstream_transformations": upstream,
        "downstream_transformations": downstream,
        "transformations": direct_transformations,
        "current_inventory": float(lot.available_quantity),
        "unit": lot.unit,
    }
