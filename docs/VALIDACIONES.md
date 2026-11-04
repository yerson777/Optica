# Validaciones y observaciones por módulo

Todas las pantallas muestran ayudas breves debajo de los campos. Los campos obligatorios llevan el asterisco que agrega Angular Material y los formularios indican “Los campos con * son obligatorios”.

Las validaciones se aplican en dos capas:

1. **Angular**: evita enviar datos incompletos y muestra el error junto al campo.
2. **Laravel**: vuelve a validar todo; nunca se confía solo en el navegador.

## Inicio de sesión

| Campo | Obligatorio | Validación | Observación en pantalla |
| --- | --- | --- | --- |
| Usuario | Sí | Requerido, máximo 50 caracteres, no solo espacios | “Escríbelo tal como te lo entregaron.” |
| Contraseña | Sí | Requerida, máximo 255 caracteres | “Distingue mayúsculas, minúsculas y símbolos.” |

Además, el backend limita a 5 intentos por minuto y bloquea usuarios inactivos.

## Clientes

| Campo | Obligatorio | Validación | Observación en pantalla |
| --- | --- | --- | --- |
| Nombre completo | Sí | 3 a 150 caracteres, no solo espacios | “Nombre y apellidos tal como figuran en su documento.” |
| Número de celular | Sí | 6 a 15 dígitos; admite espacios, guiones, paréntesis y `+` | “Solo números; puedes usar espacios. Entre 6 y 15 dígitos.” |
| Observaciones | No | Máximo 2000 caracteres | “Opcional: preferencias, indicaciones o datos importantes del cliente.” |
| Duplicados | — | Se avisa si coinciden nombre o celular; se puede confirmar que es otra persona | Aviso antes de guardar |

## Recetas

| Campo | Obligatorio | Validación | Observación en pantalla |
| --- | --- | --- | --- |
| Fotografías | Sí | Al menos 1 y hasta 8; JPG/JPEG/PNG/WEBP; máximo 10 MB cada una | Instrucciones de encuadre, luz y cámara |
| Fecha de la receta | Sí | Fecha válida, no futura | “Fecha en que el profesional emitió la receta.” |
| Observaciones | No | Máximo 2000 caracteres | “Opcional: indicaciones del profesional o detalles del control.” |

La cámara abre en computadora o celular. Si no hay permiso, queda disponible “Elegir de galería”.

## Pedidos

| Campo | Obligatorio | Validación | Observación en pantalla |
| --- | --- | --- | --- |
| Receta utilizada | Sí | Debe existir y pertenecer al cliente | “Receta que respalda las medidas de este pedido.” |
| Tipo de lentes | Sí | 1 a 100 caracteres, no solo espacios | “Elige una opción o escribe el tipo exacto.” |
| Fecha del pedido | Sí | Fecha válida, no futura | “No puede ser una fecha futura.” |
| Precio total | No | Número entre 0 y 999999 | “Opcional. Si lo registras, se calcula el saldo.” |
| Adelanto | No | Número entre 0 y 999999; no puede superar el precio | “Opcional. No puede superar el precio total.” |
| Observaciones | No | Máximo 2000 caracteres | “Opcional: detalles del tratamiento, montura o fecha prometida.” |

El saldo se calcula como **precio − adelanto**. La entrega solicita confirmación y registra fecha, hora y usuario.

## Usuarios

| Campo | Obligatorio | Validación | Observación en pantalla |
| --- | --- | --- | --- |
| Nombre completo | Sí | 3 a 100 caracteres, no solo espacios | “Nombre y apellidos de la persona.” |
| Nombre de usuario | Sí | 3 a 50 caracteres; solo letras, números, `-` y `_`; único | “Sin espacios. Se usará para iniciar sesión.” |
| Contraseña | Sí | Mínimo 8 y máximo 255 caracteres | “Mínimo 8 caracteres. Compártela de forma segura.” |
| Repetir contraseña | Sí | Debe coincidir; máximo 255 | “Debe coincidir exactamente con la contraseña.” |
| Usuario activo | — | Activo por defecto | Explica que puede iniciar sesión de inmediato |

El nombre de usuario se guarda en minúsculas para evitar duplicados por mayúsculas.

## Cambiar contraseña

| Campo | Obligatorio | Validación | Observación en pantalla |
| --- | --- | --- | --- |
| Contraseña actual | Sí | Máximo 255 caracteres y debe ser correcta | “La contraseña con la que ingresaste hoy.” |
| Nueva contraseña | Sí | Mínimo 8 y máximo 255 caracteres | “Mínimo 8 caracteres.” |
| Repetir nueva contraseña | Sí | Debe coincidir; máximo 255 | “Debe coincidir exactamente con la nueva contraseña.” |

## Avisos

| Campo | Obligatorio | Validación | Observación en pantalla |
| --- | --- | --- | --- |
| Días para avisar | Sí | Entero entre 1 y 60 | Se explica el plazo y el rango permitido |

## Búsquedas y filtros

| Pantalla | Validación / comportamiento |
| --- | --- |
| Buscador global | Máximo 100 caracteres; espera 300 ms antes de consultar |
| Buscar cliente | Nombre parcial o celular; máximo 100 caracteres; resultados paginados |
| Pedidos | Estado permitido; fechas válidas; búsqueda de cliente; máximo 100 caracteres |
| Historial | Filtros por fecha, cliente, estado y texto; máximo 100 caracteres |
| Avisos | Filtro “Todos” / “Sin leer”; paginación |
| Entregas | Solo pedidos en estado “Listo para entregar”; paginación |

## Validaciones del servidor

- Nombres, usuario, tipo de lentes y descripciones se recortan antes de validar.
- El celular se normaliza a dígitos antes de guardar.
- La receta debe pertenecer al cliente del pedido.
- El adelanto no puede superar el precio.
- Las fechas de receta y pedido no pueden ser futuras.
- Las imágenes se validan por MIME real, extensión y tamaño.
- Los usuarios inactivos no pueden iniciar sesión.
- Las contraseñas se guardan con hash.
- Los intentos de login están limitados.
- Todas las respuestas de error de validación usan `422` con mensajes en español.

## Cobertura de pruebas

Las pruebas de backend (42 aprobadas, 180 aserciones) cubren autenticación, usuarios, clientes, duplicados, búsqueda, recetas, imágenes privadas, pedidos, transiciones, avisos y estadísticas. El build de Angular y las pruebas unitarias también están aprobados.
