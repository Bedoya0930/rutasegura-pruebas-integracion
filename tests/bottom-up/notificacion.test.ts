import { driverNotificacion } from '../drivers/driverNotificacion';
import { MensajeriaStub } from '../stubs/MensajeriaStub';
import { ACUDIENTES, PLACA } from '../datosPrueba';

describe('Bottom-up - eta + notificador mediante driver', () => {
  it('driverNotificacion_conBusAOchoMinutos_debeEnviarMensajeConLosMinutosDeEta', async () => {
    const mensajeria = new MensajeriaStub();

    const r = await driverNotificacion(
      mensajeria,
      PLACA,
      40,
      5,
      1.0,
      ACUDIENTES
    );

    expect(r.minutosEstimados).toBe(8);
    expect(r.smsEnviados).toBe(2);
    expect(mensajeria.enviados).toEqual([
      {
        telefono: '3001112233',
        mensaje: 'RutaSegura: el bus WPX482 llegará en aproximadamente 8 minutos.',
      },
      {
        telefono: '3007778899',
        mensaje: 'RutaSegura: el bus WPX482 llegará en aproximadamente 8 minutos.',
      },
    ]);
  });

  it('driverNotificacion_conTraficoQueSubeElETAPorEncimaDe10_noDebeEnviarSMS', async () => {
    const mensajeria = new MensajeriaStub();

    const r = await driverNotificacion(
      mensajeria,
      PLACA,
      40,
      5,
      1.5,
      ACUDIENTES
    );

    expect(r.minutosEstimados).toBe(12);
    expect(r.smsEnviados).toBe(0);
    expect(mensajeria.enviados).toEqual([]);
  });

  it('driverNotificacion_conBusDetenido_debePasarNullAlNotificadorYNoEnviarSMS', async () => {
    const mensajeria = new MensajeriaStub();

    const r = await driverNotificacion(
      mensajeria,
      PLACA,
      0,
      5,
      1.0,
      ACUDIENTES
    );

    expect(r.minutosEstimados).toBeNull();
    expect(r.smsEnviados).toBe(0);
    expect(mensajeria.enviados).toEqual([]);
  });

  it('driverNotificacion_conUnTelefonoQueFalla_debeContarSoloLosExitosos', async () => {
    const mensajeria = new MensajeriaStub().fallarPara('3001112233');

    const r = await driverNotificacion(
      mensajeria,
      PLACA,
      40,
      5,
      1.0,
      ACUDIENTES
    );

    expect(r.minutosEstimados).toBe(8);
    expect(r.smsEnviados).toBe(1);
    expect(mensajeria.enviados).toEqual([
      {
        telefono: '3007778899',
        mensaje: 'RutaSegura: el bus WPX482 llegará en aproximadamente 8 minutos.',
      },
    ]);
  });
});