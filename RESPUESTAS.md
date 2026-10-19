# Respuestas del taller — RutaSegura Integración

## Integrantes

- Juan Diego Giraldo Gomez
- Yurany Andrea Bedoya Ceballos

## Ejercicio 1 — Orden de integración

| Paso | Top-down: módulos reales | Stubs necesarios | Bottom-up: módulos reales | Drivers necesarios |
|---|---|---|---|---|
| 1 | MonitorRuta con validaciones, geo, eta y alertas reales. | ProveedorGPSStub, RepositorioRutasStub, ServicioTraficoStub y NotificadorStub. | geo, eta y alertas. | driverCalculoLlegada coordina los cálculos. |
| 2 | Se incorpora NotificadorAcudientes real en lugar de NotificadorStub. | GPS, repositorio, tráfico y MensajeriaStub. | eta y NotificadorAcudientes, con MensajeriaStub para simular los SMS. | driverNotificacion conecta el cálculo del ETA con el notificador. |
| 3 | Se amplían los escenarios del flujo completo con todos los módulos internos reales. | Se conservan los stubs de servicios externos. | Se incorpora MonitorRuta real para coordinar los módulos ya probados juntos. | Las pruebas llaman directamente a MonitorRuta; los drivers anteriores se conservan para probar las combinaciones inferiores. |

El tercer paso describe la consolidación de la integración, no un tercer nivel adicional exigido por la guía. Los servicios externos siguen simulados; no se probó una conexión con GPS ni proveedores de SMS reales.

## Preguntas

### 1. ¿Cuál es la diferencia entre un stub y un driver? ¿En qué dirección de la llamada está cada uno?

Un stub reemplaza una dependencia que el módulo bajo prueba consulta. Por ejemplo, ProveedorGPSStub.ts reemplaza al proveedor real del GPS y devuelve una posición configurada o simula una pérdida de señal. Está debajo del módulo probado: MonitorRuta llama al stub.

Un driver hace el papel del componente superior que llama a los módulos bajo prueba. Por ejemplo, driverCalculoLlegada.ts coordina las funciones reales de geo, eta y alertas, realizando parte del trabajo de MonitorRuta. Está arriba de los módulos probados.

El arreglo llamadas del stub registra las placas consultadas. Permite comprobar cuántas consultas se hicieron, con qué placas y si se evitó consultar el GPS cuando no correspondía.

Dirección de las llamadas:

- Bottom-up: driverCalculoLlegada → geo, eta y alertas.
- Top-down: MonitorRuta → ProveedorGPSStub.

El stub está debajo del módulo bajo prueba y el driver está arriba.

### 2. ¿Por qué pueden aparecer defectos al integrar módulos que pasaron sus pruebas unitarias? Den un ejemplo encontrado.

Las pruebas unitarias comprueban cada módulo con determinadas entradas, pero no garantizan que otro componente le entregue los datos correctamente. Al integrarlos pueden aparecer diferencias de unidades, formatos o condiciones permitidas.

Encontramos que el GPS entrega la velocidad en m/s, mientras que eta espera km/h. MonitorRuta no multiplicaba por 3.6 antes de llamar a eta. En la prueba monitorear_conVelocidadEnMetrosPorSegundo_debeConvertirlaAKmhAntesDeCalcularETA, esperábamos 3 minutos y obtuvimos 8.

El problema estaba en la conexión: eta recibía 10 como si fueran km/h, aunque el GPS estaba indicando 10 m/s, equivalentes a 36 km/h.

### 3. ¿Qué defecto podría pasar desapercibido con el notificador stub y detectarse con el real?

En el nivel 1, NotificadorStub solamente registra los argumentos recibidos y devuelve un número fijo. No construye mensajes, filtra acudientes ni gestiona errores de SMS. Por eso, un error en el texto, los destinatarios o el manejo de envíos fallidos podría pasar desapercibido en ese nivel.

En nuestro caso, el defecto de velocidad ya fue detectado en el nivel 1 mediante RN-18. Sin embargo, la prueba de RN-21 pasó porque los minutos del reporte se transmitían sin cambios al stub, aunque fueran incorrectos.

En el nivel 2, monitorear_debeEnviarSMSConLosMinutosCalculadosPorEtaYNoOtros comprobó el mensaje exacto y mostró que decía 8 minutos en lugar de 3. Esto evidenció la consecuencia del mismo defecto en el mensaje que recibiría el acudiente; no fue un defecto nuevo del notificador.

### 4. ¿Qué riesgo existe si el stub no se comporta como el componente real? ¿Cómo mitigarlo?

Podríamos obtener pruebas aprobadas que no representen el funcionamiento real. Si ProveedorGPSStub devolviera una velocidad ya convertida a km/h en el campo velocidadMs, podría ocultar que MonitorRuta no realiza la conversión.

Para mitigarlo, debemos construir los stubs según las interfaces y la especificación: mismas unidades, tipos de datos, respuestas y errores relevantes. En nuestras pruebas configuramos velocidadMs: 10 y calculamos de forma independiente su equivalencia de 36 km/h.

Los tipos de TypeScript ayudan, pero no distinguen automáticamente entre m/s y km/h cuando ambos son number. También se necesitan documentación, casos conocidos y pruebas de contrato con el proveedor real cuando esté disponible.

### 5. ¿Qué ventajas tienen las pruebas automatizadas frente al driver de consola? ¿Cuándo es útil este último?

npm run driver muestra una tabla de escenarios, pero debemos revisar sus resultados manualmente. En cambio, calculoLlegada.test.ts compara automáticamente los resultados con valores esperados mediante expect e identifica qué comprobación falla.

Por ejemplo, driverCalculoLlegada_conRetrasoDeExactamente15Minutos_debeReportarAlertaLeve comprueba que el retraso sea exactamente 15 y que la alerta sea LEVE. Estas comprobaciones se pueden repetir después de cada cambio para detectar regresiones.

El driver de consola es útil para explorar escenarios, entender el recorrido de los datos, hacer demostraciones y apoyar el diagnóstico. Ver una tabla razonable no reemplaza las comprobaciones automatizadas.

### 6. ¿Qué estrategia permitió encontrar primero cada defecto? ¿Por qué?

Los dos defectos se detectaron primero mediante top-down en el nivel 1.

DEF-INT-01 se encontró con monitorear_conVelocidadEnMetrosPorSegundo_debeConvertirlaAKmhAntesDeCalcularETA. Esta estrategia ejercita MonitorRuta, que recibe la velocidad del GPS y debe convertirla antes de llamar a eta.

DEF-INT-02 se encontró con monitorear_conBusQueLlegaAntesDeLaHoraProgramada_debeReportarRetrasoCeroYAlertaNinguna. El monitor entregó un retraso negativo a alertas, que lanzó un RangeError.

Las nueve pruebas bottom-up pasaron porque los drivers entregaban correctamente los datos a los módulos inferiores. driverCalculoLlegada recibía velocidad en km/h y limitaba el retraso a cero con Math.max. Por tanto, no ejecutaba las instrucciones defectuosas de MonitorRuta.

El nivel 2 confirmó además que DEF-INT-01 afectaba el texto de los SMS.

### 7. ¿Cómo permitió avanzar el stub de tráfico? ¿Qué pruebas repetir cuando exista el servicio real?

ServicioTraficoStub permitió configurar un factor fijo o simular una caída sin esperar al otro equipo ni depender de una conexión externa.

En monitorear_conServicioDeTraficoCaido_debeUsarFactorPorDefecto15 comparamos dos monitores: uno con el servicio caído y otro con factor 1.5. Ambos debían producir los mismos minutos y continuar el monitoreo.

Usamos un oráculo relativo para comprobar el comportamiento de respaldo sin confundirlo con el defecto de conversión de velocidad. Que ambos resultados coincidan no demuestra que el ETA sea correcto; su exactitud se comprueba en RN-18.

Cuando esté listo el servicio real, debemos repetir los escenarios de factores conocidos, disponibilidad y fallo usando un entorno controlado. También debemos verificar el contrato: coordenadas recibidas, formato y rango del factor devuelto, y forma de comunicar errores. Conservaremos las pruebas con stubs para seguir teniendo ejecuciones rápidas y repetibles.

### 8. ¿Por qué usar HORA_ACTUAL fija? ¿Qué pasaría a las 6:30 a. m. y a las 2:00 p. m.?

Usamos una hora fija para que las mismas entradas produzcan resultados comparables en cada ejecución. Esto cumple el principio de repetibilidad de FIRST y evita que las pruebas dependan del reloj del computador.

Por ejemplo, con un viaje de 3 minutos y llegada programada a las 06:40 del mismo día:

- Si la hora actual es 06:30, la llegada estimada es 06:33: retraso 0 y alerta NINGUNA.
- Si la hora actual es 14:00, la llegada estimada es 14:03: retraso 443 minutos y alerta GRAVE.

Si usáramos new Date() sin argumentos, el resultado cambiaría según el momento de ejecución. Con HORA_ACTUAL, siempre se utiliza el 13 de octubre de 2026 a las 06:30, zona -05:00.

### 9. ¿Cómo habría sido el diagnóstico con integración big bang?

Al conectar todo a la vez, habríamos observado un mensaje incorrecto o una interrupción del seguimiento sin tener tan delimitado su origen. Habría que investigar simultáneamente GPS, tráfico, cálculo de distancia, ETA, alertas y notificación.

Por ejemplo, un SMS con 8 minutos podría llevarnos a sospechar del texto del notificador, aunque el error se originó antes, en la conversión de velocidad de MonitorRuta.

La integración incremental facilitó el diagnóstico: primero comprobamos combinaciones inferiores con drivers; después probamos el monitor con stubs y finalmente incorporamos el notificador real para observar cómo el dato incorrecto llegaba al mensaje.

### 10. Para cada defecto, describan error → defecto → falla. ¿Es de una unidad o de la interfaz?

Las equivocaciones humanas que proponemos son inferencias a partir del código; no conocemos el proceso mental de quien lo escribió.

#### DEF-INT-01 — Conversión de velocidad

- Error humano probable: asumir que el valor recibido del GPS ya estaba expresado en km/h u olvidar convertirlo.
- Defecto en el código: MonitorRuta asigna posicion.velocidadMs directamente a velocidadKmh, sin multiplicar por 3.6.
- Falla observada: devuelve 8 minutos en lugar de 3 y el mensaje registrado por MensajeriaStub también indica 8 minutos.

El defecto está localizado en MonitorRuta, pero corresponde a la interfaz entre componentes: el GPS entrega m/s y eta espera km/h. El monitor no adapta las unidades.

#### DEF-INT-02 — Retraso negativo

- Error humano probable: no considerar que una llegada adelantada debe representar retraso cero.
- Defecto en el código: MonitorRuta calcula la diferencia entre fechas y la entrega a determinarNivelAlerta sin limitarla a un mínimo de cero.
- Falla observada: la operación lanza RangeError: El retraso no puede ser negativo y no devuelve el reporte esperado.

El defecto está localizado en MonitorRuta y afecta la interfaz con alertas: el monitor entrega un valor que incumple la condición de entrada del módulo. alertas actúa conforme a RN-08 al rechazar negativos; el monitor debía cumplir RN-20 antes de llamarlo.

## Resultados y conclusiones

Se ejecutaron 24 pruebas: 21 aprobadas y 3 fallidas, sin pruebas pendientes. Las tres fallas corresponden a dos defectos, porque el cálculo incorrecto del ETA y el SMS incorrecto comparten la misma causa.

La cobertura global fue:

| Métrica | Resultado |
|---|---|
| Sentencias | 95.04 % |
| Ramas | 84.84 % |
| Funciones | 100 % |
| Líneas | 94.94 % |

1. Las nueve pruebas ascendentes mostraron que las combinaciones de módulos inferiores funcionaban según lo esperado en los escenarios evaluados. Esto no garantizaba que MonitorRuta los conectara correctamente.

2. Las pruebas descendentes detectaron dos problemas de integración: la falta de conversión de velocidad y el manejo incorrecto de llegadas adelantadas.

3. Los stubs permitieron controlar posiciones, tráfico, fallos y respuestas sin utilizar servicios externos ni enviar SMS reales.

4. Incorporar el notificador real permitió comprobar que el error del ETA se propagaba hasta el mensaje dirigido al acudiente.

5. monitorRuta.ts alcanzó 100 % de cobertura y aun así presentó defectos. La cobertura mide ejecución de código, no garantiza corrección.

6. Se conservaron las pruebas fallidas y se documentaron los hallazgos, sin modificar src/. Las pruebas servirán para verificar las futuras correcciones y detectar si los mismos errores reaparecen.