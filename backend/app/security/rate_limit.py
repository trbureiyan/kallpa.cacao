import math
import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

# Render consulta /health cada pocos segundos desde su propia red: limitarlo tumbaría el servicio
RUTAS_SIN_LIMITE = {"/health"}


class LimitadorPorIp:
    """Ventana fija en memoria. Basta para una demo con una sola instancia; con varias habría que moverlo a la base."""

    def __init__(self, ventana_segundos: int = 60):
        self.ventana = ventana_segundos
        self._contadores: dict[tuple[str, str], tuple[float, int]] = {}
        self._ultima_limpieza = 0.0

    def permitir(self, ip: str, grupo: str, maximo: int, ahora: float | None = None) -> bool:
        ahora = time.monotonic() if ahora is None else ahora
        self._limpiar(ahora)
        inicio, cuenta = self._contadores.get((ip, grupo), (ahora, 0))
        if ahora - inicio >= self.ventana:
            inicio, cuenta = ahora, 0
        if cuenta >= maximo:
            self._contadores[(ip, grupo)] = (inicio, cuenta)
            return False
        self._contadores[(ip, grupo)] = (inicio, cuenta + 1)
        return True

    def segundos_restantes(self, ip: str, grupo: str, ahora: float | None = None) -> int:
        ahora = time.monotonic() if ahora is None else ahora
        inicio, _ = self._contadores.get((ip, grupo), (ahora, 0))
        return max(1, math.ceil(self.ventana - (ahora - inicio)))

    def _limpiar(self, ahora: float) -> None:
        # sin esto, un atacante con muchas IPs haría crecer el diccionario hasta agotar la memoria
        if ahora - self._ultima_limpieza < self.ventana:
            return
        self._ultima_limpieza = ahora
        self._contadores = {k: v for k, v in self._contadores.items() if ahora - v[0] < self.ventana}


def ip_cliente(request: Request) -> str:
    # [DECISION] CF-Connecting-IP — Render recibe todo por Cloudflare, que escribe esta cabecera y pisa la del cliente.
    # X-Forwarded-For no sirve: el cliente controla su primera entrada y evadiría el límite. Fuera de Render
    # (local, pruebas) la cabecera no existe y se usa la IP del socket.
    return request.headers.get("cf-connecting-ip") or (request.client.host if request.client else "desconocida")


def instalar_limite(app: FastAPI, por_minuto: int, login_por_minuto: int, prefijo_api: str) -> LimitadorPorIp:
    limitador = LimitadorPorIp()
    ruta_login = f"{prefijo_api}/auth/login"

    @app.middleware("http")
    async def limitar(request: Request, call_next):
        ruta = request.url.path
        if ruta in RUTAS_SIN_LIMITE or request.method == "OPTIONS":
            return await call_next(request)
        ip = ip_cliente(request)
        grupo, maximo = ("login", login_por_minuto) if ruta == ruta_login else ("api", por_minuto)
        if not limitador.permitir(ip, grupo, maximo):
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(limitador.segundos_restantes(ip, grupo))},
                content={"detail": "Demasiadas solicitudes desde su conexión. Espere un momento e intente de nuevo."},
            )
        return await call_next(request)

    return limitador
