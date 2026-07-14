// Esquemas de validación con Zod
import { z } from 'zod';

// Validar teléfono argentino (sin 0 ni 15, 10 dígitos).
// Los números argentinos siempre suman 10 dígitos: "11" + 8 dígitos (CABA/GBA),
// o una característica que empieza en 2 o 3 + los dígitos que completen 10
// (221 La Plata, 261 Mendoza, 341 Rosario, 3402 Arroyo Seco...).
// No existe característica que empiece en 4 o más.
export const phoneSchema = z
  .string()
  .min(10, 'El teléfono debe tener 10 dígitos (sin 0 ni 15)')
  .max(10, 'El teléfono debe tener 10 dígitos (sin 0 ni 15)')
  .regex(
    /^(?:11\d{8}|[23]\d{9})$/,
    'Teléfono inválido. Son 10 dígitos sin 0 ni 15. Ej: 3402500000 o 1123456789'
  );

// Validar nombre. Acepta tildes y ñ (\p{L} cubre cualquier letra Unicode) más
// apóstrofos y guiones, que aparecen en apellidos reales (D'Angelo, Sáenz-Peña).
export const nameSchema = z
  .string()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(50, 'El nombre no puede exceder 50 caracteres')
  .regex(
    /^[\p{L}\p{M}\s'’-]+$/u,
    'El nombre solo puede contener letras, espacios, apóstrofos y guiones'
  );

// Schema para formulario de reserva
export const bookingFormSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
});

// Tipo inferido del schema
export type BookingFormData = z.infer<typeof bookingFormSchema>;

// Función de validación que retorna errores o null
export const validateBookingForm = (data: unknown) => {
  const result = bookingFormSchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) {
        errors[err.path[0] as string] = err.message;
      }
    });
    return errors;
  }
  return null;
};
