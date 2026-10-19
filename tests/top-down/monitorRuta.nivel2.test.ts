import { MonitorRuta } from '../../src/monitorRuta';
import { NotificadorAcudientes } from '../../src/notificador';
import { ProveedorGPSStub } from '../stubs/ProveedorGPSStub';
import { RepositorioRutasStub } from '../stubs/RepositorioRutasStub';
import { ServicioTraficoStub } from '../stubs/ServicioTraficoStub';
import { MensajeriaStub } from '../stubs/MensajeriaStub';
import {
  BUS_CERCA,
  BUS_LEJOS,
  HORA_ACTUAL,
  PLACA,
  crearRuta,
} from '../datosPrueba';

describe('Top-down N2 - MonitorRuta + NotificadorAcudientes real', () => {
  function crearMonitor(
    mensajeria: MensajeriaStub,
    gps: ProveedorGPSStub = new ProveedorGPSStub({
      ...BUS_CERCA,
      velocidadMs: 10,
    })
  ) {
    return new MonitorRuta(
      gps,
      new RepositorioRutasStub().conRuta(PLACA, crearRuta()),
      new ServicioTraficoStub(1.0),
      new NotificadorAcudientes(mensajeria)
    );
  }

  it('monitorear_conBusCerca_debeEnviarSMSSoloAAcudientesConNotificacionesActivas', async () => {
    const mensajeria = new MensajeriaStub();
    const monitor = crearMonitor(mensajeria);

    const reporte = await monitor.monitorear(PLACA, HORA_ACTUAL);

    expect(reporte.estado).toBe('EN_RUTA');
    expect(reporte.smsEnviados).toBe(2);
    expect(mensajeria.enviados.map((envio) => envio.telefono)).toEqual([
      '3001112233',
      '3007778899',
    ]);
  });

  it('monitorear_debeEnviarSMSConLosMinutosCalculadosPorEtaYNoOtros', async () => {
    const mensajeria = new MensajeriaStub();
    const monitor = crearMonitor(mensajeria);

    const reporte = await monitor.monitorear(PLACA, HORA_ACTUAL);

    expect(reporte.estado).toBe('EN_RUTA');
    expect(reporte.smsEnviados).toBe(2);
    expect(mensajeria.enviados).toEqual([
      {
        telefono: '3001112233',
        mensaje: 'RutaSegura: el bus WPX482 llegará en aproximadamente 3 minutos.',
      },
      {
        telefono: '3007778899',
        mensaje: 'RutaSegura: el bus WPX482 llegará en aproximadamente 3 minutos.',
      },
    ]);
    expect(reporte.minutosEstimados).toBe(3);
  });

  it('monitorear_conFalloDeUnSMS_debeReportarSoloLosEnviosExitosos', async () => {
    const mensajeria = new MensajeriaStub().fallarPara('3007778899');
    const monitor = crearMonitor(mensajeria);

    const reporte = await monitor.monitorear(PLACA, HORA_ACTUAL);

    expect(reporte.estado).toBe('EN_RUTA');
    expect(reporte.smsEnviados).toBe(1);
    expect(mensajeria.enviados).toHaveLength(1);
    expect(mensajeria.enviados.map((envio) => envio.telefono)).toEqual([
      '3001112233',
    ]);
  });

  it('monitorear_conBusLejosAMasDeDiezMinutos_noDebeEnviarNingunSMS', async () => {
    const mensajeria = new MensajeriaStub();
    const gps = new ProveedorGPSStub({
      ...BUS_LEJOS,
      velocidadMs: 5,
    });
    const monitor = crearMonitor(mensajeria, gps);

    const reporte = await monitor.monitorear(PLACA, HORA_ACTUAL);

    expect(reporte.estado).toBe('EN_RUTA');
    expect(reporte.minutosEstimados).toBeGreaterThan(10);
    expect(reporte.smsEnviados).toBe(0);
    expect(mensajeria.enviados).toEqual([]);
  });
});
