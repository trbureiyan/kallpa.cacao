from sqlalchemy.orm import Session
from app.models import Lot, Transformation, TransformationOutput


def affected_quantities(db: Session, output_code: str):
    output = (db.query(Lot, TransformationOutput, Transformation)
              .join(TransformationOutput, TransformationOutput.lot_id == Lot.id)
              .join(Transformation, Transformation.id == TransformationOutput.transformation_id)
              .filter(Lot.code == output_code).first())
    if not output:
        return None
    output_lot, _, transformation = output
    input_lot = db.get(Lot, transformation.lot_id)
    return {"product_code": output_code, "origin": input_lot.origin, "lot_code": input_lot.code,
            "input_quantity": float(transformation.input_quantity),
            "output_quantity": float(output_lot.received_quantity),
            "consumed_quantity_total": float(input_lot.consumed_quantity), "unit": input_lot.unit}
