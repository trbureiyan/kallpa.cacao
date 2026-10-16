def summarize_cost(output_quantity: float, total_cost_cop: float, sale_price_cop_per_unit: float | None,
                   included_costs: list[str] | None = None):
    unit_cost = total_cost_cop / output_quantity if output_quantity > 0 else None
    margin = ((sale_price_cop_per_unit - unit_cost) / sale_price_cop_per_unit * 100
              if unit_cost is not None and sale_price_cop_per_unit is not None and sale_price_cop_per_unit > 0 else None)
    category_labels = {
        "processing": "Costos de procesamiento de la etapa",
        "purchase": "Costo de compra de materia prima",
    }
    visible_costs = [category_labels.get(category, category) for category in included_costs or []]
    return {
        "unit_cost_cop": unit_cost,
        "margin_on_sale_percent": margin,
        "formula": "Costo unitario = costo total de etapa / cantidad de salida vendible; margen = (precio - costo unitario) / precio x 100",
        "included_costs": visible_costs,
        "cost_policy": "Incluye entradas del libro de costos vinculadas a esta transformación; excluye costos de compra de la recepción.",
    }
