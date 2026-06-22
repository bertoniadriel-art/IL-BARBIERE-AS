export interface ScannerTestFixture {
  id: string;
  qr_hash: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: "pending" | "confirmed" | "attended";
  expected: string;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export const SCANNER_FIXTURES: ScannerTestFixture[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    qr_hash: "TEST-TODAY-001",
    client_name: "Cliente Test Hoy",
    client_phone: "3402000001",
    appointment_date: today(),
    appointment_time: "10:00",
    status: "confirmed",
    expected: "Check-in exitoso",
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    qr_hash: "TEST-TOMORROW-001",
    client_name: "Cliente Test Mañana",
    client_phone: "3402000002",
    appointment_date: tomorrow(),
    appointment_time: "11:00",
    status: "confirmed",
    expected: "Es para el día X",
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    qr_hash: "TEST-ATTENDED-001",
    client_name: "Cliente Test Ya Asistió",
    client_phone: "3402000003",
    appointment_date: today(),
    appointment_time: "12:00",
    status: "attended",
    expected: "Ya fue registrado",
  },
];
