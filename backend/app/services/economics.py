def summarize_cost(output_quantity: float, total_cost_cop: float, sale_price_cop_per_unit: float | None):
    unit_cost = total_cost_cop / output_quantity if output_quantity > 0 else None
    margin = ((sale_price_cop_per_unit - unit_cost) / sale_price_cop_per_unit * 100
              if unit_cost is not None and sale_price_cop_per_unit and sale_price_cop_per_unit > 0 else None)
    return {
        "unit_cost_cop": unit_cost,
        "margin_on_sale_percent": margin,
        "formula": "Costo unitario = costo total de etapa / cantidad de salida vendible; margen = (precio - costo unitario) / precio x 100",
        "included_costs": ["Costos de etapa informados por el usuario; el MVP no desglosa categorías"],
    }
