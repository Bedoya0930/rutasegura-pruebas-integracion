import { driverCalculoLlegada } from '../drivers/driverCalculoLlegada';
import {
BUS_CERCA,
  BUS_LEJOS,
  HORA_ACTUAL,
  PARADERO_COLEGIO,
} from '../datosPrueba';

describe('Bottom-up - geo + eta + alertas mediante driver', () => {
  it('driverCalculoLlegada_conBusCercaAViaLibre_debeEncadenarDistanciaETAyAlerta', () => {
    const escenario = {
      bus: BUS_CERCA,
      paradero: PARADERO_COLEGIO,
      velocidadKmh: 30,
      factorTrafico: 1.0,
      horaActual: HORA_ACTUAL,
      horaProgramadaLlegada: new Date('2026-10-13T06:40:00-05:00'),
    };

    const r = driverCalculoLlegada(escenario);

    expect(r.distanciaKm).toBeCloseTo(1.322, 3);
    expect(r.minutosEstimados).toBe(3);
    expect(r.horaEstimadaLlegada).toEqual(
      new Date('2026-10-13T06:33:00-05:00')
    );
    expect(r.minutosRetraso).toBe(0);
    expect(r.nivelAlerta).toBe('NINGUNA');
  });

  it('driverCalculoLlegada_conBusLejosYTrancon_debeReportarAlertaGrave', () => {
    const escenario = {
      bus: BUS_LEJOS,
      paradero: PARADERO_COLEGIO,
      velocidadKmh: 15,
      factorTrafico: 3.0,
      horaActual: HORA_ACTUAL,
      horaProgramadaLlegada: new Date('2026-10-13T06:40:00-05:00'),
    };

    const r = driverCalculoLlegada(escenario);

    expect(r.distanciaKm).toBeCloseTo(3.314, 3);
    expect(r.minutosEstimados).toBe(40);
    expect(r.horaEstimadaLlegada).toEqual(
      new Date('2026-10-13T07:10:00-05:00')
    );
    expect(r.minutosRetraso).toBe(30);
    expect(r.nivelAlerta).toBe('GRAVE');
  });

  it('driverCalculoLlegada_conRetrasoDeExactamente15Minutos_debeReportarAlertaLeve', () => {
    const escenario = {
      bus: BUS_CERCA,
      paradero: PARADERO_COLEGIO,
      velocidadKmh: 30,
      factorTrafico: 1.0,
      horaActual: HORA_ACTUAL,
      horaProgramadaLlegada: new Date('2026-10-13T06:18:00-05:00'),
    };

    const r = driverCalculoLlegada(escenario);

    expect(r.minutosEstimados).toBe(3);
    expect(r.horaEstimadaLlegada).toEqual(
      new Date('2026-10-13T06:33:00-05:00')
    );
    expect(r.minutosRetraso).toBe(15);
    expect(r.nivelAlerta).toBe('LEVE');
  });

  it('driverCalculoLlegada_conBusEnElParadero_debeRetornarCeroMinutos', () => {
    const escenario = {
      bus: PARADERO_COLEGIO,
      paradero: PARADERO_COLEGIO,
      velocidadKmh: 30,
      factorTrafico: 1.0,
      horaActual: HORA_ACTUAL,
      horaProgramadaLlegada: new Date('2026-10-13T06:40:00-05:00'),
    };

    const r = driverCalculoLlegada(escenario);

    expect(r.distanciaKm).toBe(0);
    expect(r.minutosEstimados).toBe(0);
    expect(r.horaEstimadaLlegada).toEqual(
      new Date('2026-10-13T06:30:00-05:00')
    );
    expect(r.minutosRetraso).toBe(0);
    expect(r.nivelAlerta).toBe('NINGUNA');
  });

  it('driverCalculoLlegada_conBusDetenido_debeRetornarETAyAlertaNull', () => {
    const escenario = {
      bus: BUS_CERCA,
      paradero: PARADERO_COLEGIO,
      velocidadKmh: 0,
      factorTrafico: 1.0,
      horaActual: HORA_ACTUAL,
      horaProgramadaLlegada: new Date('2026-10-13T06:40:00-05:00'),
    };

    const r = driverCalculoLlegada(escenario);

    expect(r.distanciaKm).toBeCloseTo(1.322, 3);
    expect(r.minutosEstimados).toBeNull();
    expect(r.horaEstimadaLlegada).toBeNull();
    expect(r.minutosRetraso).toBeNull();
    expect(r.nivelAlerta).toBeNull();
  });
});