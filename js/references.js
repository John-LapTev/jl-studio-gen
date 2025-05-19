// --- START OF FILE jl-studio.art/gen-img-ref/js/references.js ---
import { analyzeImageWithVision } from './api.js';
import { showNotification, showConfirmDialog } from './ui.js'; // Добавили showConfirmDialog
import { appState } from './main.js'; // Для доступа к глобальным настройкам, например, модели анализа

const MAX_REFERENCES = 5;
const DEFAULT_SENSITIVITY = 15; // слов для описания по умолчанию
const MAX_SENSITIVITY = 50; // Максимальное количество слов для описания
const COMPRESSION_MAX_SIZE_MB = 1.5; // Максимальный размер файла для сжатия в МБ
const COMPRESSION_MAX_WIDTH = 1024; // Максимальная ширина после сжатия
const COMPRESSION_MAX_HEIGHT = 1024; // Максимальная высота после сжатия


let uploadedReferences = []; // Массив для хранения данных о референсах
let draggedItem = null; // Для drag-n-drop

// DOM элементы, связанные с референсами
const refsContainer = document.getElementById('upload-refs-container');
const addRefBtn = document.getElementById('add-ref-btn');
const clearAllRefsBtn = document.getElementById('clear-all-refs-btn');
const referenceCountSpan = document.getElementById('reference-count');

// DOM элементы модального окна загрузки референса
const uploadRefModal = document.getElementById('upload-ref-modal');
const uploadRefDropzone = document.getElementById('upload-ref-dropzone');
const refFileUploadInput = document.getElementById('ref-file-upload-input');
const uploadRefPreviewArea = document.getElementById('upload-ref-preview-area');
const uploadRefPreviewImage = document.getElementById('upload-ref-preview-image');
const uploadRefImageType = document.getElementById('upload-ref-image-type');
const uploadRefSensitivitySlider = document.getElementById('upload-ref-sensitivity-slider');
const uploadRefSensitivityValue = document.getElementById('upload-ref-sensitivity-value');
const uploadRefCancelBtn = document.getElementById('upload-ref-cancel-btn');
const uploadRefSubmitBtn = document.getElementById('upload-ref-submit-btn');
const uploadRefLoader = document.getElementById('upload-ref-loader');

// DOM элементы модального окна настроек референса (при клике на существующий)
const refSettingsModal = document.getElementById('ref-settings-modal');
const refModalPreviewImg = document.getElementById('ref-modal-preview-img');
const refModalTypeSelect = document.getElementById('ref-modal-type-select');
const refModalSensitivitySlider = document.getElementById('ref-modal-sensitivity-slider');
const refModalSensitivityValue = document.getElementById('ref-modal-sensitivity-value');
const refModalApplyBtn = document.getElementById('ref-modal-apply-btn');
let currentEditingRefId = null;


/**
 * Инициализация обработчиков событий для референсов.
 */
function initReferences() {
    addRefBtn.addEventListener('click', openUploadRefModal);
    clearAllRefsBtn.addEventListener('click', handleClearAllReferences);

    // Обработчики для модального окна загрузки
    uploadRefDropzone.addEventListener('click', () => refFileUploadInput.click());
    uploadRefDropzone.addEventListener('dragover', handleDragOverDropzone);
    uploadRefDropzone.addEventListener('dragleave', handleDragLeaveDropzone);
    uploadRefDropzone.addEventListener('drop', handleDropOnDropzone);
    refFileUploadInput.addEventListener('change', handleRefFileSelect);
    uploadRefSensitivitySlider.addEventListener('input', updateUploadSensitivityDisplay);
    uploadRefCancelBtn.addEventListener('click', closeUploadRefModal);
    uploadRefSubmitBtn.addEventListener('click', handleSubmitRefUpload);

    // Обработчики для модального окна настроек существующего референса
    refModalSensitivitySlider.addEventListener('input', () => {
        const value = refModalSensitivitySlider.value;
        refModalSensitivityValue.textContent = value == 0 ? 'Авто (0)' : `${value} слов`;
    });
    refModalApplyBtn.addEventListener('click', handleApplyRefSettings);

    // Загрузка референсов из localStorage при инициализации (если есть)
    loadReferencesFromStorage();
    renderReferencesList();
    updateReferenceCountAndVisibility();
}

/**
 * Открывает модальное окно для загрузки нового референса.
 */
function openUploadRefModal() {
    if (uploadedReferences.length >= MAX_REFERENCES) {
        showNotification(`Можно загрузить не более ${MAX_REFERENCES} референсов.`, 'warning');
        return;
    }
    refFileUploadInput.value = ''; // Сбрасываем предыдущий выбор файла
    uploadRefPreviewImage.src = '';
    uploadRefPreviewArea.style.display = 'none';
    uploadRefImageType.value = 'Персонаж'; // Значение по умолчанию
    uploadRefSensitivitySlider.value = DEFAULT_SENSITIVITY;
    updateUploadSensitivityDisplay();
    uploadRefSubmitBtn.disabled = true;
    uploadRefLoader.style.display = 'none';
    uploadRefModal.classList.add('open');
}

/**
 * Закрывает модальное окно загрузки референса.
 */
function closeUploadRefModal() {
    uploadRefModal.classList.remove('open');
}

function handleDragOverDropzone(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadRefDropzone.classList.add('dragover');
}

function handleDragLeaveDropzone(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadRefDropzone.classList.remove('dragover');
}

function handleDropOnDropzone(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadRefDropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processRefFile(files[0]);
    }
}

function handleRefFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processRefFile(files[0]);
    }
}

/**
 * Обрабатывает выбранный файл референса: показывает превью.
 * @param {File} file - Файл изображения.
 */
function processRefFile(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Пожалуйста, выберите файл изображения (JPG, PNG, GIF).', 'error');
        uploadRefSubmitBtn.disabled = true;
        return;
    }
    // Проверка размера файла до сжатия, для информации пользователю
    if (file.size > 10 * 1024 * 1024) { // Например, 10MB лимит до сжатия
        showNotification('Файл слишком большой (макс. 10MB до сжатия).', 'error');
        uploadRefSubmitBtn.disabled = true;
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadRefPreviewImage.src = e.target.result;
        uploadRefPreviewArea.style.display = 'block';
        uploadRefSubmitBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

function updateUploadSensitivityDisplay() {
    const value = uploadRefSensitivitySlider.value;
    uploadRefSensitivityValue.textContent = value == 0 ? 'Авто (0)' : `${value} слов`;
}

/**
 * Обрабатывает подтверждение загрузки референса.
 */
async function handleSubmitRefUpload() {
    const file = refFileUploadInput.files[0];
    if (!file && !uploadRefPreviewImage.src.startsWith('data:image')) { // Если файл не выбран через input, но есть превью (drag-n-drop)
        showNotification('Ошибка: Файл не найден для загрузки.', 'error');
        return;
    }
    
    const imageType = uploadRefImageType.value;
    const sensitivity = parseInt(uploadRefSensitivitySlider.value);

    uploadRefSubmitBtn.disabled = true;
    uploadRefLoader.style.display = 'flex'; // Показываем лоадер

    try {
        const imageDataUrl = await compressImageIfNeeded(file || uploadRefPreviewImage.src);

        const newRef = {
            id: Date.now().toString(),
            dataUrl: imageDataUrl,
            type: imageType,
            sensitivity: sensitivity,
            originalName: file ? file.name : 'dropped_image.png',
            // description: '' // Описание будет получено позже, если необходимо
        };

        uploadedReferences.push(newRef);
        renderReferencesList();
        updateReferenceCountAndVisibility();
        saveReferencesToStorage();
        closeUploadRefModal();
        showNotification('Референс успешно добавлен!', 'success');

    } catch (error) {
        console.error('Ошибка при добавлении референса:', error);
        showNotification(`Ошибка: ${error.message}`, 'error');
    } finally {
        uploadRefSubmitBtn.disabled = false;
        uploadRefLoader.style.display = 'none';
    }
}

/**
 * Сжимает изображение, если оно превышает лимиты.
 * @param {File|string} fileOrDataUrl - Файл или Data URL изображения.
 * @returns {Promise<string>} Data URL обработанного изображения.
 */
function compressImageIfNeeded(fileOrDataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Не удалось загрузить изображение для сжатия.'));
        img.onload = () => {
            let { width, height } = img;
            const needsResize = width > COMPRESSION_MAX_WIDTH || height > COMPRESSION_MAX_HEIGHT;
            
            if (needsResize) {
                if (width / height > COMPRESSION_MAX_WIDTH / COMPRESSION_MAX_HEIGHT) {
                    if (width > COMPRESSION_MAX_WIDTH) {
                        height = Math.round(height * COMPRESSION_MAX_WIDTH / width);
                        width = COMPRESSION_MAX_WIDTH;
                    }
                } else {
                    if (height > COMPRESSION_MAX_HEIGHT) {
                        width = Math.round(width * COMPRESSION_MAX_HEIGHT / height);
                        height = COMPRESSION_MAX_HEIGHT;
                    }
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            let quality = 0.9; // Начальное качество для JPEG
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // Попытка уменьшить размер файла, если он все еще слишком большой
            // (DataURL примерно 4/3 от размера бинарных данных)
            while (compressedDataUrl.length * 0.75 > COMPRESSION_MAX_SIZE_MB * 1024 * 1024 && quality > 0.3) {
                quality -= 0.1;
                compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }
             // Если после сжатия JPEG все еще большой или если оригинал был PNG и не требует сильного сжатия,
             // и не слишком большой, то можно попробовать PNG
            if (fileOrDataUrl instanceof File && fileOrDataUrl.type === 'image/png' && compressedDataUrl.length * 0.75 > COMPRESSION_MAX_SIZE_MB * 1024 * 1024) {
                 const pngDataUrl = canvas.toDataURL('image/png');
                 // Выбираем PNG если он меньше или не сильно больше требуемого лимита и меньше чем JPEG
                 if (pngDataUrl.length * 0.75 <= COMPRESSION_MAX_SIZE_MB * 1024 * 1024 * 1.1 || pngDataUrl.length < compressedDataUrl.length) {
                     compressedDataUrl = pngDataUrl;
                 }
            }


            if (compressedDataUrl.length * 0.75 > COMPRESSION_MAX_SIZE_MB * 1024 * 1024) {
                 console.warn(`Изображение не удалось сжать до ${COMPRESSION_MAX_SIZE_MB}MB. Текущий примерный размер: ${(compressedDataUrl.length * 0.75 / (1024*1024)).toFixed(2)}MB`);
                 // Можно либо выбросить ошибку, либо разрешить загрузку
                 // reject(new Error(`Не удалось сжать изображение до ${COMPRESSION_MAX_SIZE_MB}MB`));
                 // return;
            }
            resolve(compressedDataUrl);
        };

        if (fileOrDataUrl instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.onerror = () => reject(new Error('Не удалось прочитать файл для сжатия.'));
            reader.readAsDataURL(fileOrDataUrl);
        } else if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:image')) {
            img.src = fileOrDataUrl;
        } else {
            reject(new Error('Неверный формат файла для сжатия.'));
        }
    });
}


/**
 * Отрисовывает список загруженных референсов.
 */
function renderReferencesList() {
    refsContainer.innerHTML = ''; // Очищаем контейнер
    uploadedReferences.forEach((ref, index) => {
        const refWrapper = createRefElement(ref, index);
        refsContainer.appendChild(refWrapper);
    });
    refsContainer.appendChild(addRefBtn); // Кнопка "добавить" всегда последняя
    addDragAndDropHandlers();
}

/**
 * Создает DOM-элемент для одного референса.
 * @param {object} refData - Данные референса.
 * @param {number} index - Индекс референса в массиве.
 * @returns {HTMLElement} Созданный DOM-элемент.
 */
function createRefElement(refData, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ref-wrapper';
    wrapper.dataset.refId = refData.id;

    wrapper.innerHTML = `
        <div class="ref-order">${index + 1}</div>
        <div class="ref-item" draggable="true">
            <img src="${refData.dataUrl}" alt="Референс ${index + 1}">
            <div class="ref-actions">
                <button class="ref-action settings" title="Настройки референса">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311a1.464 1.464 0 0 1-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413-1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z"/></svg>
                </button>
                <button class="ref-action delete" title="Удалить референс">
                    <span style="font-size: 14px; line-height: 1;">×</span>
                </button>
            </div>
        </div>
        <div class="ref-type ${refData.type.toLowerCase().replace('ё','е').replace(/\s+/g, '-')}">${refData.type}</div>
        <input type="range" min="0" max="${MAX_SENSITIVITY}" value="${refData.sensitivity}" class="sensitivity-slider ref-item-sensitivity-slider">
        <div class="sensitivity-value ref-item-sensitivity-value">${refData.sensitivity == 0 ? 'Авто (0)' : `${refData.sensitivity} слов`}</div>
    `;

    wrapper.querySelector('.ref-action.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        removeReference(refData.id);
    });
    wrapper.querySelector('.ref-action.settings').addEventListener('click', (e) => {
        e.stopPropagation();
        openRefSettingsModal(refData.id);
    });
    const slider = wrapper.querySelector('.ref-item-sensitivity-slider');
    const valueDisplay = wrapper.querySelector('.ref-item-sensitivity-value');
    slider.addEventListener('input', (e) => {
        const val = e.target.value;
        valueDisplay.textContent = val == 0 ? 'Авто (0)' : `${val} слов`;
    });
    slider.addEventListener('change', (e) => { // Сохраняем при отпускании ползунка
        updateReferenceSensitivity(refData.id, parseInt(e.target.value));
    });


    return wrapper;
}

/**
 * Удаляет референс по ID.
 * @param {string} refId - ID референса для удаления.
 */
function removeReference(refId) {
    uploadedReferences = uploadedReferences.filter(ref => ref.id !== refId);
    renderReferencesList();
    updateReferenceCountAndVisibility();
    saveReferencesToStorage();
}

/**
 * Обновляет отображение счетчика референсов и видимость кнопки "Очистить все".
 */
function updateReferenceCountAndVisibility() {
    const count = uploadedReferences.length;
    referenceCountSpan.textContent = `${count}`;
    clearAllRefsBtn.style.display = count > 0 ? 'flex' : 'none';
    addRefBtn.style.display = count < MAX_REFERENCES ? 'flex' : 'none';
}

/**
 * Обрабатывает очистку всех референсов.
 */
function handleClearAllReferences() {
    showConfirmDialog(
        'Вы уверены, что хотите удалить все референсы?',
        'Очистка референсов',
        () => {
            uploadedReferences = [];
            renderReferencesList();
            updateReferenceCountAndVisibility();
            saveReferencesToStorage();
        }
    );
}

/**
 * Открывает модальное окно настроек для существующего референса.
 * @param {string} refId - ID референса.
 */
function openRefSettingsModal(refId) {
    const refData = uploadedReferences.find(ref => ref.id === refId);
    if (!refData) return;

    currentEditingRefId = refId;
    refModalPreviewImg.src = refData.dataUrl;
    refModalTypeSelect.value = refData.type;
    refModalSensitivitySlider.value = refData.sensitivity;
    refModalSensitivityValue.textContent = refData.sensitivity == 0 ? 'Авто (0)' : `${refData.sensitivity} слов`;
    
    refSettingsModal.classList.add('open');
}

/**
 * Применяет изменения настроек референса из модального окна.
 */
function handleApplyRefSettings() {
    if (!currentEditingRefId) return;

    const refIndex = uploadedReferences.findIndex(ref => ref.id === currentEditingRefId);
    if (refIndex === -1) return;

    uploadedReferences[refIndex].type = refModalTypeSelect.value;
    uploadedReferences[refIndex].sensitivity = parseInt(refModalSensitivitySlider.value);

    renderReferencesList();
    saveReferencesToStorage();
    refSettingsModal.classList.remove('open');
    currentEditingRefId = null;
}

/**
 * Обновляет чувствительность для референса прямо из карточки.
 * @param {string} refId - ID референса.
 * @param {number} sensitivity - Новое значение чувствительности.
 */
function updateReferenceSensitivity(refId, sensitivity) {
    const refIndex = uploadedReferences.findIndex(ref => ref.id === refId);
    if (refIndex !== -1) {
        uploadedReferences[refIndex].sensitivity = sensitivity;
        saveReferencesToStorage();
        // Обновление отображения уже сделано в createRefElement
    }
}


// --- Drag-n-Drop для референсов ---
function addDragAndDropHandlers() {
    const refItemsElements = refsContainer.querySelectorAll('.ref-item');
    refItemsElements.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        // dragover и drop на родительском элементе '.ref-wrapper'
    });

    const refWrappers = refsContainer.querySelectorAll('.ref-wrapper');
    refWrappers.forEach(wrapper => {
        wrapper.addEventListener('dragover', handleDragOver);
        wrapper.addEventListener('dragenter', handleDragEnter);
        wrapper.addEventListener('dragleave', handleDragLeave);
        wrapper.addEventListener('drop', handleDrop);
        wrapper.addEventListener('dragend', handleDragEnd); // dragend на исходном элементе
    });
}

function handleDragStart(e) {
    draggedItem = this.closest('.ref-wrapper');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItem.dataset.refId);
    setTimeout(() => { // Дать браузеру время "схватить" элемент
        draggedItem.classList.add('dragging');
    }, 0);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over-active');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over-active');
}

function handleDrop(e) {
    e.stopPropagation(); // Остановить дальнейшее всплытие
    this.classList.remove('drag-over-active');

    const targetWrapper = this;
    if (draggedItem && draggedItem !== targetWrapper) {
        const draggedId = draggedItem.dataset.refId;
        const targetId = targetWrapper.dataset.refId;

        const draggedIndex = uploadedReferences.findIndex(ref => ref.id === draggedId);
        const targetIndex = uploadedReferences.findIndex(ref => ref.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Меняем элементы в массиве uploadedReferences
            const temp = uploadedReferences[draggedIndex];
            uploadedReferences.splice(draggedIndex, 1);
            uploadedReferences.splice(targetIndex, 0, temp);

            renderReferencesList(); // Перерисовываем весь список
            saveReferencesToStorage();
        }
    }
    return false;
}

function handleDragEnd() {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
    const wrappers = refsContainer.querySelectorAll('.ref-wrapper');
    wrappers.forEach(w => w.classList.remove('drag-over-active'));
    draggedItem = null;
}

// --- LocalStorage для сохранения референсов ---
function saveReferencesToStorage() {
    try {
        localStorage.setItem('jlStudioGenReferences', JSON.stringify(uploadedReferences));
    } catch (e) {
        console.warn("Не удалось сохранить референсы в localStorage:", e);
    }
}

function loadReferencesFromStorage() {
    try {
        const storedReferences = localStorage.getItem('jlStudioGenReferences');
        if (storedReferences) {
            uploadedReferences = JSON.parse(storedReferences);
            // Проверка на максимальное количество при загрузке, если вдруг в localStorage больше
            if (uploadedReferences.length > MAX_REFERENCES) {
                uploadedReferences = uploadedReferences.slice(0, MAX_REFERENCES);
            }
        }
    } catch (e) {
        console.warn("Не удалось загрузить референсы из localStorage:", e);
        uploadedReferences = [];
    }
}


/**
 * Собирает описания для всех загруженных референсов.
 * @returns {Promise<Array<{type: string, description: string, sensitivity: number}>>}
 */
async function getReferenceDescriptions() {
    const referenceInputs = [];
    if (uploadedReferences.length === 0) {
        return referenceInputs;
    }

    showNotification('Анализируем референсы...', 'info', 3000);

    for (const ref of uploadedReferences) {
        try {
            let analysisPromptText = `Describe this ${ref.type.toLowerCase()} focusing on its main visual features.`;
            if (ref.sensitivity > 0) {
                analysisPromptText += ` Be concise, using about ${ref.sensitivity} words.`;
            } else { // sensitivity == 0 (Авто)
                analysisPromptText += ` Be very concise, using about 10-15 words total, highlighting only the most distinctive elements.`;
            }
            
            // Добавление инструкций по сохранению элементов (из настроек)
            const preserveInstructions = getPreserveInstructionsText(ref.type);
            if (preserveInstructions) {
                analysisPromptText += ` ${preserveInstructions}`;
            }

            const description = await analyzeImageWithVision(
                ref.dataUrl,
                analysisPromptText,
                appState.config.imageAnalysisModel // Используем модель из глобальных настроек
            );
            referenceInputs.push({
                type: ref.type,
                description: description,
                sensitivity: ref.sensitivity // Передаем чувствительность для возможного использования в финальном промте
            });
        } catch (error) {
            console.error(`Ошибка при анализе референса (${ref.originalName}):`, error);
            showNotification(`Ошибка анализа референса ${ref.originalName}: ${error.message}`, 'error');
            // Продолжаем, даже если один референс не удалось проанализировать
        }
    }
    return referenceInputs;
}

/**
 * Формирует текстовые инструкции на основе настроек сохранения элементов.
 * @param {string} imageType - Тип изображения референса.
 * @returns {string} Текст инструкций.
 */
function getPreserveInstructionsText(imageType) {
    const preserveItems = [];
    const preserveComposition = document.getElementById('preserve-composition')?.checked;
    const preserveFace = document.getElementById('preserve-face')?.checked;
    const preserveColors = document.getElementById('preserve-colors')?.checked;

    if (preserveComposition) {
        if (imageType === 'Персонаж') {
            preserveItems.push("overall pose and composition");
        } else if (imageType === 'Место') {
            preserveItems.push("spatial arrangement");
        } else if (imageType === 'Предмет') {
            preserveItems.push("object placement");
        } else {
            preserveItems.push("composition");
        }
    }

    if (preserveFace && imageType === 'Персонаж') {
        preserveItems.push("facial features and expression");
    }

    if (preserveColors) {
        preserveItems.push("color palette and tone");
    }

    if (preserveItems.length > 0) {
        return `Preserve the ${preserveItems.join(" and the ")}.`;
    }
    return "";
}


/**
 * Заменяет текущий список референсов новым.
 * Используется для восстановления состояния, например, из истории.
 * @param {Array<object>} newReferences - Новый массив объектов референсов.
 */
function setUploadedReferences(newReferences) {
    // uploadedReferences должен быть уже объявлен как let в начале файла
    uploadedReferences.length = 0; // Очищаем текущий массив, сохраняя ссылку на оригинальный массив
    newReferences.forEach(ref => uploadedReferences.push(ref));
    renderReferencesList(); // Обновить UI
    updateReferenceCountAndVisibility(); // Обновить счетчик
    saveReferencesToStorage(); // Сохранить в localStorage
}

export {
    initReferences,
    getReferenceDescriptions,
    uploadedReferences, 
    setUploadedReferences // Новая экспортируемая функция
};

// --- END OF FILE jl-studio.art/gen-img-ref/js/references.js ---