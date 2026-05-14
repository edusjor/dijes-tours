# Landing Tours con SMTP y Comprobantes

## 1) Configuracion

1. Copia `.env.example` a `.env`.
2. Completa las credenciales SMTP y correos reales.
3. Ajusta datos de pago (SINPE, IBAN, banco, titular).

## 2) Instalacion

```bash
npm install
```

## 3) Ejecutar

```bash
npm start
```

Luego abre:

- `http://localhost:40353`

## 4) Flujo implementado

- Cliente crea pre-reserva.
- Cada tour muestra proximas salidas y boton `Detalles` (popup con incluye/no incluye + boton reservar).
- El calendario de `Fecha deseada` solo permite fechas disponibles segun el tour seleccionado.
- Cliente sube comprobante.
- El servidor guarda el archivo en `comprobantes/` con formato de fecha-hora.
- El servidor genera URL publica: `dominio.com/comprobantes/archivo.ext`.
- Se envia correo HTML al admin con datos del cliente, metodo de pago y enlace del comprobante.
- Se envia correo HTML al cliente con agradecimiento, resumen e instrucciones de pago/confirmacion.

## 6) Docker

### Construir y correr con Docker Compose

```bash
docker compose up -d --build
```

Abre:

- `http://localhost:40353`

### Logs

```bash
docker compose logs -f
```

### Detener

```bash
docker compose down
```

Notas:

- `docker-compose.yml` monta `./comprobantes` en `/app/comprobantes` para persistir archivos.
- Debes crear `.env` (basado en `.env.example`) antes de levantar el contenedor.

## 5) Variables SMTP y pagos

Revisa y completa en `.env`:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL`
- `ADMIN_EMAIL`
- `SUPPORT_EMAIL`
- `SUPPORT_WHATSAPP`
- `PAYMENT_SINPE`
- `PAYMENT_OWNER`
- `PAYMENT_BANK`
- `PAYMENT_IBAN`
- `PUBLIC_BASE_URL`
