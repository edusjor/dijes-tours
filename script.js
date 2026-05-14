const revealElements = document.querySelectorAll('[data-reveal]');

revealElements.forEach((element, index) => {
  element.style.setProperty('--delay', `${(index % 6) * 80}ms`);
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2,
  }
);

revealElements.forEach((element) => observer.observe(element));

const API_ENDPOINT = '/api/reservations';
const TOUR_IMAGES_ENDPOINT = '/api/tours/images';

const TOUR_CONFIG = {
  'Tour Rio Celeste (Costa Rica)': {
    slug: 'rio-celeste-costa-rica',
    tag: 'Costa Rica',
    deposit: 10000,
    requiresTime: false,
    nextDates: ['2026-05-25', '2026-06-08', '2026-06-22'],
    description:
      'Una experiencia natural ideal para quienes desean conocer uno de los rios mas impactantes de Costa Rica, con senderos, paisajes y acompanamiento durante todo el recorrido.',
    includes: ['Transporte', 'Guia', 'Entrada', 'Tiempo para fotografias'],
    excludes: ['Alimentacion', 'Gastos personales'],
    fallbackImages: [
      'https://picsum.photos/seed/rio-celeste-costa-rica-1/1200/800',
      'https://picsum.photos/seed/rio-celeste-costa-rica-2/1200/800',
      'https://picsum.photos/seed/rio-celeste-costa-rica-3/1200/800',
    ],
  },
  'Escapada Granada y Masaya (Nicaragua)': {
    slug: 'escapada-granada-masaya-nicaragua',
    tag: 'Nicaragua',
    deposit: 15000,
    requiresTime: false,
    nextDates: ['2026-05-30', '2026-06-13', '2026-06-27'],
    description:
      'Ruta cultural y de naturaleza para viajeros que desean explorar ciudad colonial, paseo en lancha y volcan en un solo itinerario.',
    includes: ['Transporte ida y vuelta', 'Guia local', 'Lancha', 'Hospedaje'],
    excludes: ['Almuerzos', 'Entradas opcionales'],
    fallbackImages: [
      'https://picsum.photos/seed/granada-masaya-1/1200/800',
      'https://picsum.photos/seed/granada-masaya-2/1200/800',
      'https://picsum.photos/seed/granada-masaya-3/1200/800',
    ],
  },
  'San Blas Escape (Panama)': {
    slug: 'san-blas-escape-panama',
    tag: 'Panama',
    deposit: 25000,
    requiresTime: true,
    nextDates: ['2026-06-05', '2026-06-19', '2026-07-03'],
    description:
      'Un plan de mar para desconectar en islas paradisiacas, con coordinacion previa y soporte por WhatsApp de inicio a fin.',
    includes: ['Traslados', 'Lancha', 'Hospedaje', 'Coordinacion del itinerario'],
    excludes: ['Bebidas premium', 'Actividades extras'],
    fallbackImages: [
      'https://picsum.photos/seed/san-blas-1/1200/800',
      'https://picsum.photos/seed/san-blas-2/1200/800',
      'https://picsum.photos/seed/san-blas-3/1200/800',
    ],
  },
};

const reserveButtons = document.querySelectorAll('.reserve-tour-btn');
const detailButtons = document.querySelectorAll('.details-tour-btn');
const tourDateContainers = document.querySelectorAll('[data-next-dates-for]');
const tourMediaElements = document.querySelectorAll('.tour-media');
const tourMediaNavButtons = document.querySelectorAll('.tour-media-nav');
const tourImageButtons = document.querySelectorAll('.tour-image-clickable');
const tourMediaZoomButtons = document.querySelectorAll('.tour-media-zoom');

const form = document.getElementById('reservationForm');
const formStatus = document.getElementById('formStatus');
const tourField = document.getElementById('tour');
const dateField = document.getElementById('date');
const timeField = document.getElementById('time');
const timeLabel = document.querySelector('label[for="time"]');
const nextDatesHint = document.getElementById('nextDatesHint');

const reservationFlow = document.getElementById('reservationFlow');
const summaryTour = document.getElementById('summaryTour');
const summaryDate = document.getElementById('summaryDate');
const summaryTime = document.getElementById('summaryTime');
const summaryPeople = document.getElementById('summaryPeople');
const summaryDeposit = document.getElementById('summaryDeposit');
const summaryStatus = document.getElementById('summaryStatus');
const paymentDeposit = document.getElementById('paymentDeposit');

const proofForm = document.getElementById('proofForm');
const paymentMethodField = document.getElementById('paymentMethod');
const proofFileInput = document.getElementById('proofFile');
const proofSubmitBtn = document.getElementById('proofSubmitBtn');
const proofStatus = document.getElementById('proofStatus');
const proofPublicLink = document.getElementById('proofPublicLink');

const tourModal = document.getElementById('tourModal');
const tourModalBackdrop = document.getElementById('tourModalBackdrop');
const tourModalClose = document.getElementById('tourModalClose');
const tourModalTag = document.getElementById('tourModalTag');
const tourModalTitle = document.getElementById('tourModalTitle');
const tourModalDesc = document.getElementById('tourModalDesc');
const tourModalIncludes = document.getElementById('tourModalIncludes');
const tourModalExcludes = document.getElementById('tourModalExcludes');
const tourModalReserve = document.getElementById('tourModalReserve');

const galleryModal = document.getElementById('galleryModal');
const galleryModalBackdrop = document.getElementById('galleryModalBackdrop');
const galleryModalClose = document.getElementById('galleryModalClose');
const galleryModalTag = document.getElementById('galleryModalTag');
const galleryModalTitle = document.getElementById('galleryModalTitle');
const galleryModalImage = document.getElementById('galleryModalImage');
const galleryModalCounter = document.getElementById('galleryModalCounter');
const galleryModalPrev = document.getElementById('galleryModalPrev');
const galleryModalNext = document.getElementById('galleryModalNext');
const galleryModalReserve = document.getElementById('galleryModalReserve');

const tourMediaByName = new Map();
let activeReservation = null;
let datePicker = null;
let tourImagesByName = {};
let galleryState = {
  tourName: '',
  index: 0,
};

function getTourSettings(tourName) {
  return TOUR_CONFIG[tourName] || {
    slug: '',
    tag: 'Tour',
    deposit: 10000,
    requiresTime: false,
    nextDates: [],
    description: '',
    includes: [],
    excludes: [],
    fallbackImages: [],
  };
}

function initializeDatePicker() {
  if (!dateField || typeof window.flatpickr !== 'function') {
    return;
  }

  datePicker = window.flatpickr(dateField, {
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd M Y',
    allowInput: false,
    clickOpens: true,
    disableMobile: true,
  });

  datePicker.clear();
  datePicker.set('enable', []);
}

function formatCRC(amount) {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatDateLong(dateValue) {
  if (!dateValue) {
    return '-';
  }

  const safeDate = new Date(`${dateValue}T00:00:00`);
  return safeDate.toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateShort(dateValue) {
  const safeDate = new Date(`${dateValue}T00:00:00`);
  return safeDate.toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
  });
}

function getTourImages(tourName) {
  const loadedImages = tourImagesByName[tourName];

  if (Array.isArray(loadedImages) && loadedImages.length) {
    return loadedImages;
  }

  const fallbackImages = getTourSettings(tourName).fallbackImages;
  return fallbackImages.length ? fallbackImages : ['https://picsum.photos/seed/tour-default/1200/800'];
}

function renderTourMedia(tourName, preferredIndex) {
  const mediaElement = tourMediaByName.get(tourName);

  if (!mediaElement) {
    return;
  }

  const imageElement = mediaElement.querySelector('.tour-image-clickable');
  const counterElement = mediaElement.querySelector('.tour-media-count');
  const images = getTourImages(tourName);

  let index = Number(mediaElement.dataset.imageIndex || 0);

  if (typeof preferredIndex === 'number' && Number.isFinite(preferredIndex)) {
    index = preferredIndex;
  }

  if (!Number.isFinite(index) || index < 0) {
    index = 0;
  }

  if (index >= images.length) {
    index = 0;
  }

  mediaElement.dataset.imageIndex = String(index);
  mediaElement.dataset.totalImages = String(images.length);

  if (imageElement) {
    imageElement.src = images[index];
    imageElement.alt = `${tourName} foto ${index + 1}`;
  }

  if (counterElement) {
    counterElement.textContent = `${index + 1} / ${images.length}`;
  }
}

function renderAllTourMedia() {
  Object.keys(TOUR_CONFIG).forEach((tourName) => {
    renderTourMedia(tourName, 0);
  });
}

function changeTourMediaIndex(tourName, direction) {
  const mediaElement = tourMediaByName.get(tourName);

  if (!mediaElement) {
    return;
  }

  const images = getTourImages(tourName);

  if (images.length <= 1) {
    return;
  }

  const currentIndex = Number(mediaElement.dataset.imageIndex || 0);
  const nextIndex = (currentIndex + direction + images.length) % images.length;
  renderTourMedia(tourName, nextIndex);
}

async function loadTourImagesFromServer() {
  try {
    const response = await fetch(TOUR_IMAGES_ENDPOINT, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();

    if (!result.ok || !result.tours) {
      return;
    }

    Object.entries(TOUR_CONFIG).forEach(([tourName, settings]) => {
      const files = result.tours[settings.slug];

      if (Array.isArray(files) && files.length) {
        tourImagesByName[tourName] = files;
        renderTourMedia(tourName, 0);
      }
    });
  } catch (error) {
    console.warn('No se pudieron cargar imagenes desde carpetas de tours.', error);
  }
}

function setStatusPill(statusText) {
  if (!summaryStatus) {
    return;
  }

  summaryStatus.classList.remove('status-payment', 'status-validation', 'status-approved');

  if (statusText === 'Pendiente de validacion') {
    summaryStatus.classList.add('status-validation');
  } else if (statusText === 'Validada manualmente') {
    summaryStatus.classList.add('status-approved');
  } else {
    summaryStatus.classList.add('status-payment');
  }

  summaryStatus.textContent = statusText;
}

function showReservationFlow(reservation) {
  if (!reservationFlow) {
    return;
  }

  reservationFlow.hidden = false;
  summaryTour.textContent = reservation.tour;
  summaryDate.textContent = formatDateLong(reservation.date);
  summaryTime.textContent = reservation.time || 'No aplica';
  summaryPeople.textContent = reservation.people;
  summaryDeposit.textContent = formatCRC(reservation.deposit);
  paymentDeposit.textContent = formatCRC(reservation.deposit);
  setStatusPill(reservation.status);
}

function renderTourDateChips() {
  tourDateContainers.forEach((container) => {
    const tourName = container.dataset.nextDatesFor;
    const settings = getTourSettings(tourName);

    if (!settings.nextDates.length) {
      container.innerHTML = '<span class="date-chip">Sin fechas publicadas</span>';
      return;
    }

    container.innerHTML = settings.nextDates
      .map((date) => `<span class="date-chip">${formatDateShort(date)}</span>`)
      .join('');
  });
}

function updateTimeRequirement() {
  if (!tourField || !timeField || !timeLabel) {
    return;
  }

  const selectedTour = tourField.value;
  const settings = getTourSettings(selectedTour);

  if (settings.requiresTime) {
    timeField.required = true;
    timeLabel.textContent = 'Hora (requerida para este tour)';
  } else {
    timeField.required = false;
    timeLabel.textContent = 'Hora (si aplica)';
    timeField.value = '';
  }
}

function configureDatePickerForTour(tourName) {
  const settings = getTourSettings(tourName);
  const availableDates = settings.nextDates;

  if (datePicker) {
    datePicker.set('enable', availableDates);

    const currentValue = dateField.value;

    if (currentValue && availableDates.includes(currentValue)) {
      datePicker.setDate(currentValue, false, 'Y-m-d');
    } else if (availableDates.length) {
      datePicker.setDate(availableDates[0], false, 'Y-m-d');
    } else {
      datePicker.clear(false);
      dateField.value = '';
    }

    return;
  }

  if (!availableDates.length) {
    dateField.value = '';
    return;
  }

  if (!availableDates.includes(dateField.value)) {
    dateField.value = availableDates[0];
  }
}

function syncDateHint() {
  if (!tourField || !nextDatesHint || !dateField) {
    return;
  }

  const selectedTour = tourField.value;

  if (!selectedTour) {
    nextDatesHint.textContent = 'Selecciona un tour para ver proximas fechas disponibles.';

    if (datePicker) {
      datePicker.clear(false);
      datePicker.set('enable', []);
    } else {
      dateField.value = '';
    }

    return;
  }

  const settings = getTourSettings(selectedTour);

  if (!settings.nextDates.length) {
    nextDatesHint.textContent = 'Aun no hay salidas publicadas para este tour.';
    configureDatePickerForTour(selectedTour);
    return;
  }

  const labels = settings.nextDates.map((date) => formatDateLong(date));
  nextDatesHint.textContent = `Proximas salidas: ${labels.join(' | ')}`;
  configureDatePickerForTour(selectedTour);
}

function isDateAllowedForTour(tourName, dateValue) {
  const settings = getTourSettings(tourName);

  if (!settings.nextDates.length) {
    return true;
  }

  return settings.nextDates.includes(dateValue);
}

function clearProofFeedback() {
  if (proofStatus) {
    proofStatus.textContent = '';
  }

  if (proofPublicLink) {
    proofPublicLink.hidden = true;
    proofPublicLink.href = '#';
  }
}

function renderModalList(listElement, values) {
  if (!listElement) {
    return;
  }

  listElement.innerHTML = '';

  values.forEach((value) => {
    const item = document.createElement('li');
    item.textContent = value;
    listElement.appendChild(item);
  });
}

function updateBodyModalState() {
  const detailsOpen = tourModal && !tourModal.hidden;
  const galleryOpen = galleryModal && !galleryModal.hidden;
  document.body.classList.toggle('modal-open', Boolean(detailsOpen || galleryOpen));
}

function openTourModal(tourName) {
  if (!tourModal) {
    return;
  }

  closeGalleryModal(true);

  const settings = getTourSettings(tourName);
  tourModalTag.textContent = settings.tag;
  tourModalTitle.textContent = tourName;
  tourModalDesc.textContent = settings.description;
  renderModalList(tourModalIncludes, settings.includes);
  renderModalList(tourModalExcludes, settings.excludes);
  tourModalReserve.dataset.tour = tourName;

  tourModal.hidden = false;
  updateBodyModalState();
}

function closeTourModal(skipBodyUpdate) {
  if (!tourModal) {
    return;
  }

  tourModal.hidden = true;

  if (!skipBodyUpdate) {
    updateBodyModalState();
  }
}

function updateGalleryModalView() {
  const tourName = galleryState.tourName;

  if (!tourName || !galleryModalImage) {
    return;
  }

  const settings = getTourSettings(tourName);
  const images = getTourImages(tourName);

  if (!images.length) {
    return;
  }

  if (galleryState.index < 0 || galleryState.index >= images.length) {
    galleryState.index = 0;
  }

  galleryModalTag.textContent = settings.tag;
  galleryModalTitle.textContent = tourName;
  galleryModalImage.src = images[galleryState.index];
  galleryModalImage.alt = `${tourName} foto ${galleryState.index + 1}`;
  galleryModalCounter.textContent = `${galleryState.index + 1} / ${images.length}`;
  galleryModalReserve.dataset.tour = tourName;
}

function openGalleryModal(tourName, index) {
  if (!galleryModal) {
    return;
  }

  closeTourModal(true);

  galleryState.tourName = tourName;
  galleryState.index = Number(index || 0);

  updateGalleryModalView();

  galleryModal.hidden = false;
  updateBodyModalState();
}

function closeGalleryModal(skipBodyUpdate) {
  if (!galleryModal) {
    return;
  }

  galleryModal.hidden = true;

  if (!skipBodyUpdate) {
    updateBodyModalState();
  }
}

function changeGalleryImage(direction) {
  const tourName = galleryState.tourName;

  if (!tourName) {
    return;
  }

  const images = getTourImages(tourName);

  if (images.length <= 1) {
    return;
  }

  galleryState.index = (galleryState.index + direction + images.length) % images.length;
  updateGalleryModalView();
}

function applyTourSelection(selectedTour) {
  if (!selectedTour || !tourField) {
    return;
  }

  tourField.value = selectedTour;
  updateTimeRequirement();
  syncDateHint();

  if (formStatus) {
    formStatus.textContent = `Tour seleccionado: ${selectedTour}. Completa la pre-reserva y envia comprobante.`;
  }
}

tourMediaElements.forEach((mediaElement) => {
  const tourName = mediaElement.dataset.tour;

  if (tourName) {
    tourMediaByName.set(tourName, mediaElement);
  }
});

Object.entries(TOUR_CONFIG).forEach(([tourName, settings]) => {
  tourImagesByName[tourName] = settings.fallbackImages.slice();
});

reserveButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyTourSelection(button.dataset.tour);
  });
});

detailButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedTour = button.dataset.tour;
    openTourModal(selectedTour);
  });
});

tourMediaNavButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tourName = button.dataset.tour;
    const direction = Number(button.dataset.direction || 1);
    changeTourMediaIndex(tourName, direction);
  });
});

tourImageButtons.forEach((imageElement) => {
  imageElement.addEventListener('click', () => {
    const tourName = imageElement.dataset.tour;
    const mediaElement = tourMediaByName.get(tourName);
    const currentIndex = Number(mediaElement?.dataset.imageIndex || 0);
    openGalleryModal(tourName, currentIndex);
  });
});

tourMediaZoomButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tourName = button.dataset.tour;
    const mediaElement = tourMediaByName.get(tourName);
    const currentIndex = Number(mediaElement?.dataset.imageIndex || 0);
    openGalleryModal(tourName, currentIndex);
  });
});

if (tourModalClose) {
  tourModalClose.addEventListener('click', () => closeTourModal(false));
}

if (tourModalBackdrop) {
  tourModalBackdrop.addEventListener('click', () => closeTourModal(false));
}

if (tourModalReserve) {
  tourModalReserve.addEventListener('click', () => {
    applyTourSelection(tourModalReserve.dataset.tour || '');
    closeTourModal(false);
  });
}

if (galleryModalClose) {
  galleryModalClose.addEventListener('click', () => closeGalleryModal(false));
}

if (galleryModalBackdrop) {
  galleryModalBackdrop.addEventListener('click', () => closeGalleryModal(false));
}

if (galleryModalPrev) {
  galleryModalPrev.addEventListener('click', () => changeGalleryImage(-1));
}

if (galleryModalNext) {
  galleryModalNext.addEventListener('click', () => changeGalleryImage(1));
}

if (galleryModalReserve) {
  galleryModalReserve.addEventListener('click', () => {
    applyTourSelection(galleryModalReserve.dataset.tour || '');
    closeGalleryModal(false);
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (galleryModal && !galleryModal.hidden) {
      closeGalleryModal(false);
      return;
    }

    if (tourModal && !tourModal.hidden) {
      closeTourModal(false);
    }

    return;
  }

  if (galleryModal && !galleryModal.hidden) {
    if (event.key === 'ArrowLeft') {
      changeGalleryImage(-1);
    }

    if (event.key === 'ArrowRight') {
      changeGalleryImage(1);
    }
  }
});

if (tourField) {
  tourField.addEventListener('change', () => {
    updateTimeRequirement();
    syncDateHint();
  });
}

if (form) {
  initializeDatePicker();
  updateTimeRequirement();
  syncDateHint();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const selectedDate = dateField.value.trim();

    const data = {
      name: form.name.value.trim(),
      whatsapp: form.whatsapp.value.trim(),
      email: form.email.value.trim(),
      tour: form.tour.value.trim(),
      date: selectedDate,
      time: form.time.value,
      people: form.people.value,
      message: form.message.value.trim(),
    };

    const settings = getTourSettings(data.tour);

    if (!data.name || !data.whatsapp || !data.email || !data.tour || !data.date || !data.people) {
      formStatus.textContent = 'Por favor completa todos los campos obligatorios.';
      return;
    }

    if (settings.requiresTime && !data.time) {
      formStatus.textContent = 'Este tour requiere una hora de salida. Selecciona la hora para continuar.';
      return;
    }

    if (!isDateAllowedForTour(data.tour, data.date)) {
      formStatus.textContent = 'Selecciona una fecha habilitada en el calendario para este tour.';
      return;
    }

    activeReservation = {
      ...data,
      deposit: settings.deposit,
      status: 'Pendiente de pago',
    };

    clearProofFeedback();
    showReservationFlow(activeReservation);

    formStatus.textContent = 'Pre-reserva creada. Ahora selecciona metodo de pago y sube el comprobante para enviar.';

    if (reservationFlow) {
      reservationFlow.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });
}

if (proofForm) {
  proofForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!activeReservation) {
      proofStatus.textContent = 'Primero completa la pre-reserva.';
      return;
    }

    const paymentMethod = paymentMethodField?.value?.trim();
    const proofFile = proofFileInput?.files?.[0];

    if (!paymentMethod) {
      proofStatus.textContent = 'Selecciona el metodo de pago.';
      return;
    }

    if (!proofFile) {
      proofStatus.textContent = 'Selecciona la captura del comprobante para continuar.';
      return;
    }

    if (proofFile.size > 6 * 1024 * 1024) {
      proofStatus.textContent = 'El archivo supera 6MB. Usa una captura mas liviana.';
      return;
    }

    const payload = new FormData();
    payload.append('name', activeReservation.name);
    payload.append('whatsapp', activeReservation.whatsapp);
    payload.append('email', activeReservation.email);
    payload.append('tour', activeReservation.tour);
    payload.append('date', activeReservation.date);
    payload.append('time', activeReservation.time || '');
    payload.append('people', activeReservation.people);
    payload.append('message', activeReservation.message || '');
    payload.append('deposit', String(activeReservation.deposit));
    payload.append('paymentMethod', paymentMethod);
    payload.append('proofFile', proofFile);

    const originalButtonText = proofSubmitBtn ? proofSubmitBtn.textContent : 'Enviar';

    if (proofSubmitBtn) {
      proofSubmitBtn.disabled = true;
      proofSubmitBtn.textContent = 'Enviando solicitud...';
    }

    proofStatus.textContent = 'Enviando datos y comprobante...';

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: payload,
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'No se pudo enviar la solicitud.');
      }

      activeReservation.status = 'Pendiente de validacion';
      showReservationFlow(activeReservation);

      proofStatus.textContent = 'Solicitud enviada. Revisa tu correo; tambien enviamos los datos al administrador.';

      if (proofPublicLink && result.proofUrl) {
        proofPublicLink.hidden = false;
        proofPublicLink.href = result.proofUrl;
        proofPublicLink.textContent = `Ver comprobante: ${result.proofUrl}`;
      }

      proofForm.reset();
    } catch (error) {
      proofStatus.textContent = error.message || 'No fue posible completar la solicitud.';
    } finally {
      if (proofSubmitBtn) {
        proofSubmitBtn.disabled = false;
        proofSubmitBtn.textContent = originalButtonText;
      }
    }
  });
}

renderTourDateChips();
renderAllTourMedia();
loadTourImagesFromServer();
