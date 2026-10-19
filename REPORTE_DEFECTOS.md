# Reporte de defectos de integración — RutaSegura v1.1

## Integrantes

- Juan Diego Giraldo Gomez
- Yurany Andrea Bedoya Ceballos

## Resumen de ejecución

Se ejecutaron 24 pruebas: 21 aprobadas y 3 fallidas, sin pruebas pendientes.

Las tres pruebas fallidas detectan dos defectos diferentes:

- DEF-INT-01: falta la conversión de velocidad de m/s a km/h. Se detecta en el cálculo del ETA y en el texto del SMS.
- DEF-INT-02: se entrega un retraso negativo al módulo de alertas cuando el bus llega adelantado.

Las pruebas se conservan fallando porque sus resultados esperados corresponden a la especificación. No se modificó la carpeta src/.

## Cobertura obtenida

Comando ejecutado: `npm.cmd run test:coverage`.

| Métrica global | Cobertura |
|---|---|
| Sentencias | 95.04 % |
| Ramas | 84.84 % |
| Funciones | 100 % |
| Líneas | 94.94 % |

El módulo monitorRuta.ts alcanzó 100 % en las cuatro métricas, aunque contiene los dos defectos detectados. La cobertura indica qué código se ejecutó, pero no garantiza que los resultados sean correctos.

### DEF-INT-01 — Falta conversión de velocidad de m/s a km/h

| Campo | Detalle |
|---|---|
| Regla incumplida | RN-18. El resultado incorrecto también llega al mensaje enviado mediante el notificador. |
| Módulos e interfaz involucrados | ProveedorGPS entrega velocidadMs. MonitorRuta debe convertirla a km/h antes de entregarla a las funciones de eta. El tiempo calculado se transmite después a NotificadorAcudientes. |
| Pruebas que lo detectan | `monitorear_conVelocidadEnMetrosPorSegundo_debeConvertirlaAKmhAntesDeCalcularETA` y `monitorear_debeEnviarSMSConLosMinutosCalculadosPorEtaYNoOtros`. |
| Archivos de prueba | `tests/top-down/monitorRuta.nivel1.test.ts` y `tests/top-down/monitorRuta.nivel2.test.ts`. |
| Datos de entrada | Placa WPX482; BUS_CERCA; PARADERO_COLEGIO; velocidad GPS de 10 m/s; factor de tráfico 1.0; hora actual y hora programada 2026-10-13 a las 06:30, zona -05:00; acudientes de la ruta de prueba. |
| Resultado esperado | ETA de 3 minutos y mensajes que indiquen aproximadamente 3 minutos. Conversión: 10 × 3.6 = 36 km/h. Cálculo aproximado: (1.322 / 36) × 60 = 2.2033…; redondeando hacia arriba, 3. |
| Resultado obtenido | ETA de 8 minutos. Los dos mensajes registrados por MensajeriaStub indican aproximadamente 8 minutos. |
| Causa identificada | En `src/monitorRuta.ts`, la instrucción `const velocidadKmh = posicion.velocidadMs;` utiliza directamente la velocidad en m/s como si estuviera expresada en km/h. |
| Severidad | Alta: afecta la estimación de llegada y transmite un tiempo incorrecto a los mensajes dirigidos a los acudientes. También puede alterar el retraso calculado y las decisiones de notificación. |
| Consecuencia para el usuario | El acudiente recibiría un aviso que indica 8 minutos en lugar de los 3 exigidos por la fórmula, lo que podría afectar su organización para llegar al paradero. |
| Reproducción | Ejecutar `npm.cmd test -- tests/top-down`. |
| Estado | Defecto documentado. Las dos pruebas se conservan fallando y src/ permanece sin modificaciones. |

#### Evidencia del nivel 1

- Esperado por Jest: `3`.
- Obtenido: `8`.

#### Evidencia del nivel 2

Mensaje esperado:

> RutaSegura: el bus WPX482 llegará en aproximadamente 3 minutos.

Mensaje obtenido:

> RutaSegura: el bus WPX482 llegará en aproximadamente 8 minutos.

MensajeriaStub registró el texto incorrecto para los dos acudientes con notificaciones activas. No se enviaron SMS reales.

Las dos pruebas detectan la misma causa. El mensaje incorrecto no se registra como un defecto independiente del notificador: este transmite el tiempo que recibe de MonitorRuta.

### DEF-INT-02 — Retraso negativo cuando el bus llega adelantado

| Campo | Detalle |
|---|---|
| Regla incumplida | RN-20. |
| Módulos e interfaz involucrados | MonitorRuta calcula minutosRetraso y lo entrega a determinarNivelAlerta, del módulo alertas. Esta función exige un retraso no negativo. |
| Prueba que lo detecta | `monitorear_conBusQueLlegaAntesDeLaHoraProgramada_debeReportarRetrasoCeroYAlertaNinguna`. |
| Archivo de prueba | `tests/top-down/monitorRuta.nivel1.test.ts`. |
| Datos de entrada | Placa WPX482; BUS_CERCA; PARADERO_COLEGIO; velocidad GPS de 10 m/s; factor 1.0; hora actual 06:30 y llegada programada 06:45 del 13 de octubre de 2026, zona -05:00. |
| Resultado esperado | Retornar un reporte con estado EN_RUTA, minutosRetraso igual a 0 y nivelAlerta NINGUNA. |
| Resultado obtenido | La operación lanza `RangeError: El retraso no puede ser negativo` y no devuelve el reporte esperado. |
| Causa identificada | En `src/monitorRuta.ts` se calcula la diferencia entre la hora estimada y la programada, pero no se limita a un mínimo de cero antes de llamar a determinarNivelAlerta. |
| Severidad | Alta: interrumpe el monitoreo en una situación válida, cuando el bus llega antes de lo programado. |
| Consecuencia para el usuario | No se genera el reporte de seguimiento de esa consulta, aunque el bus tenga una posición válida y esté en movimiento. |
| Reproducción | Ejecutar `npm.cmd test -- tests/top-down/monitorRuta.nivel1.test.ts`. |
| Estado | Defecto documentado. La prueba se conserva fallando y src/ permanece sin modificaciones. |

#### Evidencia

Jest muestra:

> RangeError: El retraso no puede ser negativo

La excepción se lanza en determinarNivelAlerta y se propaga desde MonitorRuta.monitorear.

Con el cálculo actual, la hora estimada es 06:38 y la programada es 06:45: la diferencia es -7 minutos. MonitorRuta debería convertir ese adelanto en retraso 0 antes de consultar el nivel de alerta.

Este defecto es independiente de DEF-INT-01. Si se corrigiera la conversión de velocidad, la llegada estimada sería 06:33 y la diferencia seguiría siendo negativa. Por tanto, seguiría siendo necesario limitar el retraso a cero.