// Regla del ejercicio: % Merma = ((Entrada - Salida) / Entrada) * 100
export const calcularMerma = (entradaKg: number, salidaKg: number): number => {
  if (entradaKg <= 0) return 0;
  const merma = ((entradaKg - salidaKg) / entradaKg) * 100;
  return Number(merma.toFixed(2));
};

// Evaluar si supera el umbral del 15% para activar la alerta (RF04)
export const esMermaCritica = (porcentajeMerma: number): boolean => {
  return porcentajeMerma > 15;
};

// Regla: Costo Unitario = Costo Total / Salida Vendible
export const calcularCostoUnitario = (costoTotalCOP: number, salidaKg: number): number => {
  if (salidaKg <= 0) return 0;
  return Number((costoTotalCOP / salidaKg).toFixed(2));
};

// Regla: Margen sobre Venta = ((Precio - Costo Unitario) / Precio) * 100
export const calcularMargenVenta = (precioVentaCOP: number, costoUnitarioCOP: number): number => {
  if (precioVentaCOP <= 0) return 0;
  const margen = ((precioVentaCOP - costoUnitarioCOP) / precioVentaCOP) * 100;
  return Number(margen.toFixed(2));
};