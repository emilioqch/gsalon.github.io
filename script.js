// ====== CONFIGURACIÓN DE BLOQUEOS ======
const horasBloqueadasRecurrentes = ["09:00", "13:30", "16:00"];
const bloquesEspecificos = ["2025-09-25T10:00", "2025-09-25T15:00"];
const MSG_RESERVADA = "Lo sentimos, esa hora ya está reservada. Elige otra.";
const MSG_OK = "¡Listo! Tu cita ha sido reservada.";
const MSG_FALTAN = "Por favor completa todos los campos.";

// Referencias a elementos del DOM
const $form = document.getElementById('formulario-cita');
const $nombre = document.getElementById('nombre');
const $email = document.getElementById('email');
const $servicio = document.getElementById('servicio');
const $fecha = document.getElementById('fecha');
const $hora = document.getElementById('hora');
const $msg = document.getElementById('mensaje-confirmacion');

const hoyISO = new Date().toISOString().slice(0, 10);
$fecha.min = hoyISO;

function pad(n) { return String(n).padStart(2, "0"); }
function toLocalISO(date) {
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
}

function esHoraBloqueadaRecurrente(hhmm) {
    return horasBloqueadasRecurrentes.includes(hhmm);
}
function esBloqueEspecifico(isoLocal) {
    return bloquesEspecificos.includes(isoLocal.slice(0, 16));
}
function estaReservada(fechaStr, horaStr) {
    if (!fechaStr || !horaStr) return false;
    if (esHoraBloqueadaRecurrente(horaStr)) return true;
    const d = new Date(`${fechaStr}T${horaStr}`);
    const isoLocal = toLocalISO(d);
    return esBloqueEspecifico(isoLocal);
}

function mostrarConfirmacion(texto, ok = false) {
    $msg.textContent = texto;
    $msg.style.display = 'block';
    $msg.style.backgroundColor = ok ? '#d4edda' : '#f8d7da';
    $msg.style.borderColor = ok ? '#c3e6cb' : '#f5c6cb';
    $msg.style.color = ok ? '#155724' : '#721c24';
}

// ====== MANEJADOR DEL FORMULARIO ======
$form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Captura de valores
    const nombre = $nombre.value.trim();
    const email = $email.value.trim();
    const servicio = $servicio.value;
    const fecha = $fecha.value;
    const hora = $hora.value;

    // 1. Validación de campos
    if (!nombre || !email || !servicio || !fecha || !hora) {
        mostrarConfirmacion(MSG_FALTAN, false);
        return;
    }

    // 2. Validación de disponibilidad
    if (estaReservada(fecha, hora)) {
        mostrarConfirmacion(MSG_RESERVADA, false);
        return;
    }

    // --- IDs de EmailJS (CORREGIDOS FINALMENTE) ---
    const SERVICE_ID = 'gsalon'; 
    // Los IDs de plantilla deben ser EXACTOS a tus plantillas en EmailJS
    const TEMPLATE_ID_CLIENTE = 'template_cliente_confirm'; // CORRECCIÓN
    const TEMPLATE_ID_EMPRESA = 'template_empresa_notific'; // CORRECCIÓN

    // --- PRIMER ENVÍO: CORREO AL CLIENTE (CONFIRMACIÓN) ---
    emailjs.send(SERVICE_ID, TEMPLATE_ID_CLIENTE, {
        name: nombre,
        email: email, // Destinatario del cliente (usado en el Template)
        service: servicio,
        date: fecha,
        time: hora
    })
        .then(r => {
            console.log('Correo de cliente enviado con éxito:', r);

            // --- SEGUNDO ENVÍO: NOTIFICACIÓN INTERNA A LA EMPRESA ---
            return emailjs.send(SERVICE_ID, TEMPLATE_ID_EMPRESA, {
                name: nombre,
                email: email, // Correo del cliente (para referencia en la notificación)
                service: servicio,
                date: fecha,
                time: hora
            });
        })
        .then(r2 => {
            // Muestra mensaje de éxito tras ambos envíos
            mostrarConfirmacion(`${MSG_OK} Cita para ${servicio} reservada. ¡Revisa tu correo!`, true);
            $form.reset();
            console.log('Notificación a la empresa enviada con éxito:', r2);
        })
        .catch(err => {
            // Muestra mensaje de error genérico si falla
            mostrarConfirmacion("Error al reservar la cita. Por favor, verifica tu conexión o la configuración de EmailJS.", false);
            console.error('Error en el proceso de reserva/envío de correo:', err);
        });
});
