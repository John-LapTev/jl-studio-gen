// --- START OF FILE jl-studio.art/gen-img-ref/js/ui.js ---
import { appState, saveAppState, loadAppState, generatedImageHistory, saveGeneratedImageToHistory } from './main.js';
import { uploadedReferences } from './references.js'; // Для отображения в модалке рефа
import { regenerateLastImage, handleGenerateClick } from './generator.js'; // Для кнопок в модалке просмотра

// --- DOM элементы общие для UI ---
const generatorPanel = document.getElementById('generator-panel');
const generatorHandle = document.getElementById('generator-handle');
const promptInput = document.getElementById('prompt-input');
const galleryGrid = document.getElementById('gallery-grid');
const galleryEmptyMessage = document.getElementById('gallery-empty');
const notificationContainer = document.getElementById('notification-container');

// --- DOM элементы кнопок опций ---
const stylesBtn = document.getElementById('styles-btn');
const trendsBtn = document.getElementById('trends-btn');
const sizesBtn = document.getElementById('sizes-btn');
const countBtn = document.getElementById('count-btn');
const settingsBtn = document.getElementById('settings-btn');
const modelsBtn = document.getElementById('models-btn');
const enhancePromptToggle = document.getElementById('enhance-prompt-toggle');

// --- DOM элементы модальных окон ---
const imageDetailsModal = document.getElementById('image-details-modal');
const refSettingsModal = document.getElementById('ref-settings-modal');
const settingsModal = document.getElementById('settings-modal');
const promptPreviewModal = document.getElementById('prompt-preview-modal');
const modelsModal = document.getElementById('models-modal');
const stylesModal = document.getElementById('styles-modal');
const trendsModal = document.getElementById('trends-modal');
const sizesModal = document.getElementById('sizes-modal');
const countModal = document.getElementById('count-modal');
const uploadRefModal = document.getElementById('upload-ref-modal'); // Уже есть в references.js, но здесь тоже может понадобиться для закрытия

// --- Инициализация UI ---
function initUI() {
    // Динамическая высота поля ввода промта
    if (promptInput) {
        promptInput.addEventListener('input', autoResizePromptInput);
        promptInput.addEventListener('keydown', handlePromptInputKeydown);
    }

    // Кнопки опций
    if (stylesBtn) stylesBtn.addEventListener('click', () => toggleModal(stylesModal));
    if (trendsBtn) trendsBtn.addEventListener('click', () => toggleModal(trendsModal));
    if (sizesBtn) sizesBtn.addEventListener('click', () => toggleModal(sizesModal));
    if (countBtn) countBtn.addEventListener('click', () => toggleModal(countModal));
    if (settingsBtn) settingsBtn.addEventListener('click', () => toggleModal(settingsModal));
    if (modelsBtn) modelsBtn.addEventListener('click', () => toggleModal(modelsModal));

    // Чекбокс улучшения промта
    if (enhancePromptToggle) {
        enhancePromptToggle.addEventListener('change', (e) => {
            appState.enhancePrompt = e.target.checked;
            saveAppState();
        });
        // Устанавливаем начальное состояние из appState
        enhancePromptToggle.checked = appState.enhancePrompt;
    }
    
    // Закрытие модальных окон
    document.querySelectorAll('.modal-close, .settings-close, .prompt-preview-close, .models-close, .styles-close, .trends-close, .sizes-close, .count-close, .upload-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modalId || e.target.closest('.modal-overlay, .settings-modal, .prompt-preview-modal, .models-modal, .styles-modal, .trends-modal, .sizes-modal, .count-modal, .upload-modal')?.id;
            if (modalId) {
                const modalToClose = document.getElementById(modalId);
                if (modalToClose) closeModal(modalToClose);
            }
        });
    });
    // Закрытие модалки по клику на оверлей
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay);
            }
        });
    });
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    initImageDetailsModalListeners();
    initSettingsModalListeners();
    initPromptPreviewModalListeners();
    initModelsModalListeners();
    initStylesModalListeners(); // Загрузка и обработчики для стилей
    initTrendsModalListeners(); // Загрузка и обработчики для трендов
    initSizesModalListeners();
    initCountModalListeners();
    
    // Изначально отрисовать галерею из истории
    renderGallery();
    updateOptionButtonLabels(); // Обновить тексты кнопок опций при загрузке
    
    // Панель генератора и отступ для галереи
    const generatorPanelWrapper = document.getElementById('generator-panel-wrapper');
    // generatorPanel все еще нужен для доступа к его scrollHeight
    const generatorPanelElement = document.getElementById('generator-panel'); 

    if (generatorPanelWrapper && generatorHandle && generatorPanelElement) {
        const mainContainer = document.querySelector('.main-container');
        const fixedHandleHeight = generatorHandle.offsetHeight || 41;

        const adjustUIForPanelState = () => {
            if (!mainContainer || !generatorPanelWrapper || !generatorHandle || !generatorPanelElement) return;
            const fixedHandleHeight = generatorHandle.offsetHeight || 41; // Убедимся, что высота ручки есть
            let panelWrapperBottomOffset; // Это будет bottom для generatorHandle

            if (generatorPanelWrapper.classList.contains('expanded')) {
                // Когда панель раскрыта, ручка должна быть НАД ней.
                // Высота wrapper'а будет фактической высотой видимой панели.
                // Используем getBoundingClientRect().height для wrapper'а, т.к. он анимируется
                panelWrapperBottomOffset = generatorPanelWrapper.getBoundingClientRect().height;
                mainContainer.style.paddingBottom = `${panelWrapperBottomOffset + fixedHandleHeight + 24}px`;
            } else {
                // Когда панель свернута, wrapper имеет height: 0 (или почти 0, если padding не убран),
                // а ручка должна быть видна снизу.
                panelWrapperBottomOffset = 0; // Ручка будет на самом низу окна
                mainContainer.style.paddingBottom = `${fixedHandleHeight + 24}px`;
            }
            generatorHandle.style.bottom = `${panelWrapperBottomOffset}px`;
        };
        
        // Установить начальное состояние на основе сохраненного значения
        if (appState.isPanelExpanded) {
            generatorPanelWrapper.classList.add('expanded');
        } else {
            generatorPanelWrapper.classList.remove('expanded');
        }
        requestAnimationFrame(adjustUIForPanelState);

        generatorHandle.addEventListener('click', () => {
            generatorPanelWrapper.classList.toggle('expanded');
            // Обновляем состояние в appState и сохраняем
            appState.isPanelExpanded = generatorPanelWrapper.classList.contains('expanded');
            saveAppState();
            // Для CSS transition по max-height, нужно дать время на перерасчет
            setTimeout(adjustUIForPanelState, 50); // Небольшая задержка для начала анимации
            setTimeout(adjustUIForPanelState, 350); // После завершения анимации
        });
        
        if (typeof ResizeObserver !== "undefined") {
            new ResizeObserver(adjustUIForPanelState).observe(generatorPanelWrapper);
            new ResizeObserver(() => { // Также наблюдаем за самой панелью на случай изменения контента
                 if (generatorPanelWrapper.classList.contains('expanded')) {
                    adjustUIForPanelState();
                }
            }).observe(generatorPanelElement);
        } else {
            window.addEventListener('resize', adjustUIForPanelState);
        }
    }
}

function autoResizePromptInput() {
    this.style.height = 'auto'; // Сбросить высоту
    this.style.height = (this.scrollHeight) + 'px';
}

function handlePromptInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Предотвратить стандартное поведение Enter (перенос строки)
        document.getElementById('generate-btn').click(); // Имитировать клик по кнопке "Сгенерировать"
    }
    // Shift+Enter для переноса строки уже обрабатывается браузером по умолчанию для textarea
}


// --- Управление модальными окнами ---

/**
 * Переключает состояние видимости указанного модального окна.
 * Если модальное окно было закрыто, оно откроется (при этом все другие модалки закроются).
 * Если модальное окно было открыто, оно закроется.
 * @param {HTMLElement} modalElementToToggle - DOM-элемент модального окна.
 */
function toggleModal(modalElementToToggle) {
    if (!modalElementToToggle) {
        console.error("toggleModal: Попытка переключить неопределенный модальный элемент.");
        return;
    }

    const isCurrentlyOpen = modalElementToToggle.classList.contains('open');

    // Сначала всегда закрываем ВСЕ ОТКРЫТЫЕ модальные окна
    closeAllModals();

    // Если модальное окно, которое мы хотим переключить, НЕ БЫЛО тем, что только что закрылось
    // (т.е. оно было закрыто до вызова closeAllModals или не было затронуто им, если оно не .open),
    // И мы хотим его открыть (т.е. оно не было isCurrentlyOpen до вызова closeAllModals)
    // ТО открываем его.
    // Это предотвращает случай, когда модалка закрывается и тут же открывается снова.
    if (!isCurrentlyOpen) {
        modalElementToToggle.classList.add('open');
    }
    // Если оно было isCurrentlyOpen, то closeAllModals его уже закрыл, и больше ничего делать не нужно.
}

/**
 * Закрывает указанное модальное окно.
 * @param {HTMLElement} modalElement - DOM-элемент модального окна.
 */
function closeModal(modalElement) {
    if (modalElement) {
        modalElement.classList.remove('open');
    } else {
        console.warn("closeModal: Попытка закрыть неопределенный модальный элемент.");
    }
}

/**
 * Закрывает все активные модальные окна на странице.
 */
function closeAllModals() {
    const openModals = document.querySelectorAll(
        '.modal-overlay.open, .settings-modal.open, .prompt-preview-modal.open, .models-modal.open, .styles-modal.open, .trends-modal.open, .sizes-modal.open, .count-modal.open, .upload-modal.open'
    );
    openModals.forEach(modal => {
        modal.classList.remove('open');
    });
}

// --- Уведомления ---
/**
 * Показывает уведомление.
 * @param {string} message - Сообщение.
 * @param {'info'|'success'|'warning'|'error'} type - Тип уведомления.
 * @param {number} duration - Длительность показа в мс (0 - не скрывать автоматически).
 */
function showNotification(message, type = 'info', duration = 5000) {
    if (!notificationContainer) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const iconSvg = {
        info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>',
        success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>'
    };

    notification.innerHTML = `
        <div class="notification-icon">${iconSvg[type] || iconSvg.info}</div>
        <div class="notification-content">
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">×</button>
    `;

    notificationContainer.appendChild(notification);

    // Показать уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 10); // Небольшая задержка для срабатывания transition

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400); // Удалить после анимации
    });

    if (duration > 0) {
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 400);
        }, duration);
    }
}


// --- Галерея ---
function renderGallery() {
    if (!galleryGrid || !galleryEmptyMessage) return;

    galleryGrid.innerHTML = ''; // Очистить текущие элементы
    
    // Добавляем кнопку "Создать новое" как первый элемент галереи
    const newProjectButton = document.createElement('div');
    newProjectButton.className = 'gallery-item new-project-button';
    newProjectButton.innerHTML = `
        <div class="new-project-content">
            <div class="new-project-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
            </div>
            <div class="new-project-text">Создать новое</div>
        </div>
    `;
    newProjectButton.addEventListener('click', () => {
        showConfirmDialog(
            'Это действие сбросит все текущие настройки (стили, промты, размеры, модель и т.д.) к значениям по умолчанию. Вы уверены?',
            'Создать новый проект',
            () => {
                resetToDefaultSettings();
                showNotification('Настройки сброшены к значениям по умолчанию', 'success');
            }
        );
    });
    galleryGrid.appendChild(newProjectButton);
    
    if (generatedImageHistory.length === 0) {
        galleryEmptyMessage.style.display = 'block';
    } else {
        galleryEmptyMessage.style.display = 'none';
        // Отображаем в обратном порядке (новые сверху)
        generatedImageHistory.slice().reverse().forEach(imgData => {
            const item = createGalleryItem(imgData);
            galleryGrid.appendChild(item);
        });
    }
}

function createGalleryItem(imgData) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.imageId = imgData.id;
    item.innerHTML = `
        <img src="${imgData.src}" alt="Сгенерированное изображение ${imgData.id}">
        <div class="gallery-item-overlay">
            <span class="gallery-item-prompt-preview">${imgData.prompt.substring(0, 50)}${imgData.prompt.length > 50 ? '...' : ''}</span>
        </div>
        <div class="gallery-item-actions">
            <button class="gallery-action regenerate-btn" title="Перегенерировать с этим промтом">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                </svg>
            </button>
            <button class="gallery-action copy-prompt-btn" title="Копировать промт">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                </svg>
            </button>
            <button class="gallery-action use-settings-btn" title="Использовать настройки">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                     <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
                </svg>
            </button>
            <button class="gallery-action delete-btn" title="Удалить из истории">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
            </button>
        </div>
    `;
    item.addEventListener('click', (e) => {
        if (!e.target.closest('.gallery-action')) {
            openImageDetailsModal(imgData.id);
        }
    });
    item.querySelector('.regenerate-btn').addEventListener('click', () => {
        // Для регенерации из галереи, передаем все настройки изображения
        const historyEntry = generatedImageHistory.find(entry => entry.id === imgData.id);
        if (historyEntry) {
            regenerateLastImage(historyEntry);
        }
    });
    item.querySelector('.copy-prompt-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(imgData.prompt)
            .then(() => showNotification('Промт скопирован!', 'success'))
            .catch(err => showNotification('Не удалось скопировать промт.', 'error'));
    });
    item.querySelector('.use-settings-btn').addEventListener('click', () => {
        applySettingsFromHistory(imgData.id);
        showNotification('Настройки применены. Можете изменить промт или референсы.', 'info');
    });
    item.querySelector('.delete-btn').addEventListener('click', () => {
        showConfirmDialog(
            'Удалить это изображение из истории? Это действие необратимо.',
            'Удаление изображения',
            () => {
                const index = generatedImageHistory.findIndex(entry => entry.id === imgData.id);
                if (index > -1) {
                    generatedImageHistory.splice(index, 1);
                    localStorage.setItem('jlStudioGeneratedImages', JSON.stringify(generatedImageHistory));
                    renderGallery(); // Перерисовать галерею
                    showNotification('Изображение удалено из истории.', 'info');
                }
            }
        );
    });
    return item;
}

function applySettingsFromHistory(imageId) {
    const settings = generatedImageHistory.find(img => img.id === imageId);
    if (!settings) return;

    // Применяем основные настройки в appState
    appState.selectedSize = { width: settings.width, height: settings.height };
    appState.selectedModel = settings.model;
    appState.currentSeedValue = settings.seed;
    appState.useRandomSeed = false; // При использовании сида из истории, отключаем случайный
    appState.enhancePrompt = settings.enhancePrompt;
    appState.generationCount = 1; // Применяем настройки для одной генерации
    
    // Восстанавливаем промт в поле ввода
    if (promptInput) {
        promptInput.value = settings.prompt;
        autoResizePromptInput.call(promptInput); // Обновить высоту поля ввода
    }
    
    // Восстанавливаем референсы (если они были)
    import('./references.js').then(referencesModule => {
        const newRefs = settings.references ? JSON.parse(JSON.stringify(settings.references)) : [];
        if (referencesModule.setUploadedReferences) { // Добавил проверку существования функции
            referencesModule.setUploadedReferences(newRefs); 
        } else {
            console.error("Функция setUploadedReferences не найдена в references.js");
        }
    });


    // Восстанавливаем стиль
    if (settings.style && settings.style.id && appState.stylesData) {
        appState.selectedStyle = appState.stylesData.find(s => s.id === settings.style.id) || null;
    } else {
        appState.selectedStyle = null;
    }
     // Восстанавливаем тренд
    if (settings.trend && settings.trend.id && appState.trendsData) {
        appState.selectedTrend = appState.trendsData.find(t => t.id === settings.trend.id) || null;
    } else {
        appState.selectedTrend = null;
    }
    // Если применили тренд, а стиль был, сбрасываем стиль (и наоборот, если бы стиль применялся из тренда)
    if (appState.selectedTrend) appState.selectedStyle = null;
    // Эта строка не нужна, т.к. если выбран стиль, тренд уже сброшен при выборе стиля:
    // else if (appState.selectedStyle) appState.selectedTrend = null;


    // Обновляем UI кнопок опций
    updateOptionButtonLabels();
    
    // Обновляем состояние UI элементов настроек
    const seedInputElement = document.getElementById('seed-input');
    const randomSeedToggleElement = document.getElementById('random-seed-toggle');
    const enhancePromptToggleElement = document.getElementById('enhance-prompt-toggle');
    
    if(seedInputElement) seedInputElement.value = appState.currentSeedValue;
    if(randomSeedToggleElement) {
        randomSeedToggleElement.checked = appState.useRandomSeed;
        if(seedInputElement) seedInputElement.disabled = appState.useRandomSeed; // Обновить disabled состояние
    }
    if(enhancePromptToggleElement) enhancePromptToggleElement.checked = appState.enhancePrompt;
    
    const currentSeedDisplay = document.getElementById('current-seed-display');
    if(currentSeedDisplay) currentSeedDisplay.textContent = appState.useRandomSeed ? 'Случайный' : appState.currentSeedValue;

    if(settings.preserveSettings) {
        const compCheckbox = document.getElementById('preserve-composition');
        const faceCheckbox = document.getElementById('preserve-face');
        const colorsCheckbox = document.getElementById('preserve-colors');
        if(compCheckbox) compCheckbox.checked = settings.preserveSettings.composition;
        if(faceCheckbox) faceCheckbox.checked = settings.preserveSettings.face;
        if(colorsCheckbox) colorsCheckbox.checked = settings.preserveSettings.colors;
        // Также обновить appState.preserveSettings
        appState.preserveSettings.composition = compCheckbox ? compCheckbox.checked : true;
        appState.preserveSettings.face = faceCheckbox ? faceCheckbox.checked : true;
        appState.preserveSettings.colors = colorsCheckbox ? colorsCheckbox.checked : true;
    }


    // Сохраняем примененное состояние
    saveAppState();

    // Прокручиваем к панели генератора и открываем ее, если она свернута
    const panelWrapperForScroll = document.getElementById('generator-panel-wrapper');
    if (panelWrapperForScroll) {
        if (!panelWrapperForScroll.classList.contains('expanded')) {
             if(generatorHandle) generatorHandle.click(); // Клик по ручке для раскрытия и обновления padding
        }
        // Прокручиваем к верху панели (ручке) после возможного раскрытия
        setTimeout(() => { // Даем время на анимацию раскрытия
            if (generatorHandle) generatorHandle.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 350);
    }    
}


// --- Модальное окно деталей изображения ---
let currentOpenImageId = null;
function initImageDetailsModalListeners() {
    const modalDownloadBtn = document.getElementById('modal-download-btn');
    const modalRegenerateBtn = document.getElementById('modal-regenerate-btn');

    if (modalDownloadBtn) {
        modalDownloadBtn.addEventListener('click', () => {
            const imgSrc = document.getElementById('modal-image-preview-src').src;
            if (imgSrc && currentOpenImageId) {
                const imageToDownload = generatedImageHistory.find(img => img.id === currentOpenImageId);
                if (imageToDownload) {
                    downloadImage(imageToDownload.src, `jl-studio-gen-${imageToDownload.seed || Date.now()}.png`);
                }
            }
        });
    }
    if (modalRegenerateBtn) {
        modalRegenerateBtn.addEventListener('click', () => {
            if (currentOpenImageId) {
                const historyEntry = generatedImageHistory.find(entry => entry.id === currentOpenImageId);
                if (historyEntry) {
                    closeModal(imageDetailsModal); // Закрываем модалку перед регенерацией
                    regenerateLastImage(historyEntry);
                }
            }
        });
    }
}

function openImageDetailsModal(imageId) {
    const imgData = generatedImageHistory.find(img => img.id === imageId);
    if (!imgData || !imageDetailsModal) return;

    currentOpenImageId = imageId;

    document.getElementById('modal-image-preview-src').src = imgData.src;
    document.getElementById('modal-image-prompt').textContent = imgData.prompt;
    document.getElementById('modal-image-model').textContent = imgData.model || 'N/A';
    document.getElementById('modal-image-size').textContent = `${imgData.width}×${imgData.height}`;
    document.getElementById('modal-image-seed').textContent = imgData.seed || 'N/A';
    document.getElementById('modal-image-date').textContent = new Date(imgData.timestamp).toLocaleString();
    
    imageDetailsModal.classList.add('open');
}

function downloadImage(url, filename) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        })
        .catch(err => {
            console.error("Ошибка скачивания:", err);
            showNotification("Не удалось скачать изображение.", "error");
            // Попытка скачать через 'a' download напрямую, если fetch не удался (например, CORS для data: URL)
            if (url.startsWith('data:')) {
                try {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (directDownloadError) {
                     console.error("Ошибка прямого скачивания data URL:", directDownloadError);
                }
            }
        });
}


// --- Модальное окно настроек генерации ---
function initSettingsModalListeners() {
    if (!settingsModal) return;
    const seedInput = document.getElementById('seed-input');
    const randomSeedToggle = document.getElementById('random-seed-toggle');
    const currentSeedDisplay = document.getElementById('current-seed-display');
    
    const preserveComposition = document.getElementById('preserve-composition');
    const preserveFace = document.getElementById('preserve-face');
    const preserveColors = document.getElementById('preserve-colors');

    // Загрузка состояния при открытии модалки
    settingsBtn.addEventListener('click', () => { // Используем settingsBtn, т.к. toggleModal вызывается из него
        if (settingsModal.classList.contains('open')) { // Только если модалка открывается
            seedInput.value = appState.currentSeedValue;
            randomSeedToggle.checked = appState.useRandomSeed;
            seedInput.disabled = appState.useRandomSeed;
            currentSeedDisplay.textContent = appState.useRandomSeed ? 'Случайный' : appState.currentSeedValue;

            if (preserveComposition) preserveComposition.checked = appState.preserveSettings.composition;
            if (preserveFace) preserveFace.checked = appState.preserveSettings.face;
            if (preserveColors) preserveColors.checked = appState.preserveSettings.colors;
        }
    });

    if (seedInput) {
        seedInput.addEventListener('change', (e) => {
            appState.currentSeedValue = e.target.value;
            currentSeedDisplay.textContent = appState.useRandomSeed ? 'Случайный' : appState.currentSeedValue;
            saveAppState();
        });
    }
    if (randomSeedToggle) {
        randomSeedToggle.addEventListener('change', (e) => {
            appState.useRandomSeed = e.target.checked;
            seedInput.disabled = appState.useRandomSeed;
            currentSeedDisplay.textContent = appState.useRandomSeed ? 'Случайный' : appState.currentSeedValue;
            saveAppState();
        });
    }
    
    const checkboxes = [preserveComposition, preserveFace, preserveColors];
    const keys = ['composition', 'face', 'colors'];
    checkboxes.forEach((cb, index) => {
        if (cb) {
            cb.addEventListener('change', (e) => {
                appState.preserveSettings[keys[index]] = e.target.checked;
                saveAppState();
            });
        }
    });
}

// --- Модальное окно предпросмотра промта ---
function initPromptPreviewModalListeners() {
    if (!promptPreviewModal) return;
    const editBtn = document.getElementById('edit-prompt-btn-modal');
    const cancelBtn = document.getElementById('cancel-edit-btn-modal');
    const saveBtn = document.getElementById('save-edit-btn-modal');
    const contentArea = document.getElementById('prompt-preview-content-area');
    const textarea = document.getElementById('prompt-edit-textarea-main');
    const initialActions = document.getElementById('prompt-preview-initial-actions');
    const editActions = document.getElementById('prompt-edit-actions-modal');

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            contentArea.style.display = 'none';
            textarea.value = appState.lastRawFinalPrompt || contentArea.textContent; // Использовать последний "сырой" или текущий отображаемый
            textarea.style.display = 'block';
            initialActions.style.display = 'none';
            editActions.style.display = 'flex';
            textarea.focus();
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            contentArea.style.display = 'block';
            textarea.style.display = 'none';
            initialActions.style.display = 'flex';
            editActions.style.display = 'none';
        });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            appState.editedFinalPrompt = textarea.value.trim(); // Сохраняем отредактированный промт
            contentArea.textContent = appState.editedFinalPrompt;
            contentArea.style.display = 'block';
            textarea.style.display = 'none';
            initialActions.style.display = 'flex';
            editActions.style.display = 'none';
            showNotification('Отредактированный промт сохранен и будет использован для следующей генерации.', 'info');
            saveAppState(); // Сохраняем состояние, если appState.editedFinalPrompt часть сохраняемого состояния
        });
    }
}

function showPromptPreviewModal(promptText, isEditing = false) {
    if (!promptPreviewModal) return;
    const contentArea = document.getElementById('prompt-preview-content-area');
    const textarea = document.getElementById('prompt-edit-textarea-main');
    const initialActions = document.getElementById('prompt-preview-initial-actions');
    const editActions = document.getElementById('prompt-edit-actions-modal');
    
    appState.lastRawFinalPrompt = promptText; // Сохраняем "сырой" промт для возможности редактирования
    appState.editedFinalPrompt = ''; // Сбрасываем отредактированный
    
    contentArea.textContent = promptText;
    
    if (isEditing) {
        contentArea.style.display = 'none';
        textarea.value = promptText;
        textarea.style.display = 'block';
        initialActions.style.display = 'none';
        editActions.style.display = 'flex';
    } else {
        contentArea.style.display = 'block';
        textarea.style.display = 'none';
        initialActions.style.display = 'flex';
        editActions.style.display = 'none';
    }
    promptPreviewModal.classList.add('open');
}

// --- Модальное окно моделей ---
function initModelsModalListeners() {
    if (!modelsModal || !appState.imageModelsData || !appState.imageModelsData.imageModelDetails) return;
    const modelsListContainer = document.getElementById('models-list-container');
    modelsListContainer.innerHTML = ''; // Очищаем

    // Сначала фильтруем детали моделей по тем, что доступны в API
    const availableModelDetails = appState.imageModelsData.imageModelDetails.filter(detail =>
        appState.availableImageModelsFromAPI.includes(detail.id)
    );
    
    // Если после фильтрации ничего не осталось, но API вернуло хоть что-то,
    // создадим "заглушки" для моделей из API, чтобы пользователь хотя бы мог их выбрать.
    if (availableModelDetails.length === 0 && appState.availableImageModelsFromAPI.length > 0) {
        appState.availableImageModelsFromAPI.forEach(apiModelId => {
            const card = createModelCard({
                id: apiModelId,
                name: apiModelId.charAt(0).toUpperCase() + apiModelId.slice(1), // Простое имя из ID
                description: "Описание для этой модели не найдено в конфигурации.",
                isDefault: apiModelId === appState.imageModelsData.defaultImageModel,
                stats: { speed: "N/A", quality: "N/A", filter: "N/A" }
            }, apiModelId === appState.selectedModel);
            modelsListContainer.appendChild(card);
        });
    } else {
        availableModelDetails.forEach(modelData => {
            const card = createModelCard(modelData, modelData.id === appState.selectedModel);
            modelsListContainer.appendChild(card);
        });
    }


    // Обновляем кнопку выбора модели при инициализации
    updateModelsButtonLabel();
}

function createModelCard(modelData, isActive) {
    const card = document.createElement('div');
    card.className = 'model-card';
    if (isActive) card.classList.add('active');
    card.dataset.modelId = modelData.id;
    card.innerHTML = `
        <div class="model-head">
            <div class="model-name">${modelData.name}</div>
            ${modelData.badge ? `<div class="model-badge">${modelData.badge}</div>` : ''}
            ${modelData.isDefault && appState.imageModelsData.defaultImageModel === modelData.id && !modelData.badge ? '<div class="model-badge">По умолчанию</div>' : ''}
        </div>
        <div class="model-description">${modelData.description}</div>
        <div class="model-stats">
            <div class="model-stat">
                <div class="model-stat-value">${modelData.stats.speed}</div>
                <div class="model-stat-label">Скорость</div>
            </div>
            <div class="model-stat">
                <div class="model-stat-value">${modelData.stats.quality}</div>
                <div class="model-stat-label">Качество</div>
            </div>
            <div class="model-stat">
                <div class="model-stat-value">${modelData.stats.filter}</div>
                <div class="model-stat-label">Фильтр</div>
            </div>
        </div>
        ${modelData.notes ? `<div style="font-size:12px; color:var(--text-secondary); margin-top:10px; text-align:center;">${modelData.notes}</div>` : ''}
    `;
    card.addEventListener('click', () => selectModel(modelData.id));
    return card;
}

function selectModel(modelId) {
    appState.selectedModel = modelId;
    // Обновляем активную карточку
    document.querySelectorAll('#models-list-container .model-card').forEach(card => {
        card.classList.toggle('active', card.dataset.modelId === modelId);
    });
    updateModelsButtonLabel();
    closeModal(modelsModal);
    
    // Проверка для модели gptimage и количества генераций
    if (modelId === 'gptimage' && appState.generationCount > 1) {
        appState.generationCount = 1;
        showNotification('Для модели GPT Image можно генерировать только 1 изображение за раз. Количество изменено.', 'info');
        updateCountButtonLabel(); // Обновить текст кнопки количества
        // Если модалка количества открыта, обновить и ее
        if (countModal.classList.contains('open')) {
            document.querySelectorAll('#count-options-container .count-option').forEach(opt => {
                 opt.classList.toggle('active', parseInt(opt.dataset.count) === 1);
                 opt.classList.toggle('disabled', parseInt(opt.dataset.count) > 1);
            });
        }
    } else {
        // Разблокировать опции количества, если была выбрана не gptimage
         document.querySelectorAll('#count-options-container .count-option').forEach(opt => {
            opt.classList.remove('disabled');
        });
    }
    saveAppState();
}

function updateModelsButtonLabel() {
    if (!modelsBtn || !appState.imageModelsData || !appState.imageModelsData.imageModelDetails) return;
    const selectedModelData = appState.imageModelsData.imageModelDetails.find(m => m.id === appState.selectedModel) || 
                              appState.availableImageModelsFromAPI.includes(appState.selectedModel) ? { name: appState.selectedModel } : null; // Заглушка, если нет в деталях

    const modelName = selectedModelData ? selectedModelData.name : appState.selectedModel; // Отображаем ID, если имя не найдено
    modelsBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
        </svg>
        <span>Модель: ${modelName}</span>
    `;
}

// --- Модальное окно стилей ---
function initStylesModalListeners() {
    if (!stylesModal || !appState.stylesData) return;
    const stylesGridContainer = document.getElementById('styles-grid-container');
    stylesGridContainer.innerHTML = '';

    appState.stylesData.forEach(styleData => {
        const item = createStyleItem(styleData, styleData.id === (appState.selectedStyle ? appState.selectedStyle.id : null));
        stylesGridContainer.appendChild(item);
    });
    updateStylesButtonLabel();
}

function createStyleItem(styleData, isActive) {
    const item = document.createElement('div');
    item.className = 'style-item';
    if (isActive) item.classList.add('active');
    item.dataset.styleId = styleData.id;
    item.innerHTML = `
        <img src="${styleData.image}" alt="${styleData.name}" class="style-image">
        <div class="style-name">${styleData.name}</div>
    `;
    item.addEventListener('click', () => selectStyle(styleData.id));
    return item;
}

function selectStyle(styleId) {
    const selected = appState.stylesData.find(s => s.id === styleId);
    if (selected && selected.id === "none") { // "Нет" стиля
        appState.selectedStyle = null;
    } else {
        appState.selectedStyle = selected || null;
    }
    appState.selectedTrend = null; // Сброс тренда при выборе стиля

    document.querySelectorAll('#styles-grid-container .style-item').forEach(item => {
        item.classList.toggle('active', item.dataset.styleId === styleId && styleId !== "none");
    });
    
    // Сброс активного тренда в модалке трендов
    document.querySelectorAll('#trends-grid-container .trend-item').forEach(item => item.classList.remove('active'));

    updateStylesButtonLabel();
    updateTrendsButtonLabel(); // Обновить текст кнопки трендов
    closeModal(stylesModal);

    // Установить состояние enhancePromptToggle в соответствии с defaultEnhance стиля
    if (enhancePromptToggle && appState.selectedStyle && appState.selectedStyle.hasOwnProperty('defaultEnhance')) {
        enhancePromptToggle.checked = appState.selectedStyle.defaultEnhance;
        appState.enhancePrompt = enhancePromptToggle.checked; // Обновить appState
    } else if (enhancePromptToggle && !appState.selectedStyle) { // Если выбрали "Нет стиля"
        enhancePromptToggle.checked = true; // По умолчанию включаем
        appState.enhancePrompt = true;
    }
    saveAppState();
}

function updateStylesButtonLabel() {
    if (!stylesBtn) return;
    const styleName = appState.selectedStyle ? appState.selectedStyle.name : 'Стили';
    const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/><path d="M4.5 12.5A.5.5 0 0 1 5 12h3a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5m0-2A.5.5 0 0 1 5 10h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5m1.639-3.708 1.33.886 1.854-1.855a.25.25 0 0 1 .289-.047l1.888.974V7.5a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V7s1.54-1.274 1.639-1.208M6.25 5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5"/></svg>`;
    stylesBtn.innerHTML = `${baseSvg}<span>${appState.selectedStyle ? `Стиль: ${styleName}` : 'Стили'}</span>`;
}


// --- Модальное окно трендов ---
function initTrendsModalListeners() {
    if (!trendsModal || !appState.trendsData) return;
    const trendsGridContainer = document.getElementById('trends-grid-container');
    trendsGridContainer.innerHTML = '';

    appState.trendsData.forEach(trendData => {
        const item = createTrendItem(trendData, trendData.id === (appState.selectedTrend ? appState.selectedTrend.id : null));
        trendsGridContainer.appendChild(item);
    });
    updateTrendsButtonLabel();
}

function createTrendItem(trendData, isActive) {
    const item = document.createElement('div');
    item.className = 'trend-item';
    if (isActive) item.classList.add('active');
    item.dataset.trendId = trendData.id;
    item.innerHTML = `
        <img src="${trendData.image}" alt="${trendData.name}" class="trend-image">
        <div class="trend-content">
            <div class="trend-name">${trendData.name}</div>
            <div class="trend-description">${trendData.description}</div>
        </div>
    `;
    item.addEventListener('click', () => selectTrend(trendData.id));
    return item;
}

function selectTrend(trendId) {
    appState.selectedTrend = appState.trendsData.find(t => t.id === trendId) || null;
    appState.selectedStyle = null; // Сброс стиля при выборе тренда

    document.querySelectorAll('#trends-grid-container .trend-item').forEach(item => {
        item.classList.toggle('active', item.dataset.trendId === trendId);
    });
    // Сброс активного стиля в модалке стилей
    document.querySelectorAll('#styles-grid-container .style-item').forEach(item => item.classList.remove('active'));
    
    updateTrendsButtonLabel();
    updateStylesButtonLabel(); // Обновить текст кнопки стилей
    closeModal(trendsModal);

    // Тренды обычно имеют свой "enhancement", так что можно выключить глобальный
    // или оставить на усмотрение пользователя
    if (enhancePromptToggle) {
        // enhancePromptToggle.checked = false;
        // appState.enhancePrompt = false;
    }
    saveAppState();
}

function updateTrendsButtonLabel() {
    if (!trendsBtn) return;
    const trendName = appState.selectedTrend ? appState.selectedTrend.name : 'Тренды';
    const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2m0 1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1zM6 7.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm0-2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1zm0 5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1z"/></svg>`;
    trendsBtn.innerHTML = `${baseSvg}<span>${appState.selectedTrend ? `Тренд: ${trendName}` : 'Тренды'}</span>`;
}

// --- Модальное окно размеров ---
function initSizesModalListeners() {
    if (!sizesModal) return;
    const ratioButtonsContainer = document.getElementById('ratio-buttons-container');
    const previewFrame = document.getElementById('ratio-preview-frame');
    const categoryTabs = document.querySelectorAll('.size-category-tab');
    const ratioCategories = document.querySelectorAll('.ratio-category');
    const customWidthInput = document.getElementById('custom-width-input');
    const customHeightInput = document.getElementById('custom-height-input');
    const applyCustomSizeBtn = document.getElementById('apply-custom-size');

    // Обработчик для табов категорий
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            
            // Активируем выбранный таб
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Показываем соответствующие категории размеров
            if (category === 'all') {
                ratioCategories.forEach(cat => cat.style.display = 'block');
            } else {
                ratioCategories.forEach(cat => {
                    cat.style.display = cat.dataset.category === category ? 'block' : 'none';
                });
            }
        });
    });

    // Обработчик для кнопок размеров
    ratioButtonsContainer.querySelectorAll('.ratio-btn').forEach(btn => {
        // Устанавливаем активную кнопку при загрузке
        if (parseInt(btn.dataset.width) === appState.selectedSize.width && 
            parseInt(btn.dataset.height) === appState.selectedSize.height) {
            btn.classList.add('active');
            updatePreviewFrame(btn.dataset.width, btn.dataset.height, previewFrame);
        }

        btn.addEventListener('click', () => {
            ratioButtonsContainer.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const width = parseInt(btn.dataset.width);
            const height = parseInt(btn.dataset.height);
            appState.selectedSize = { width, height };
            updateSizesButtonLabel();
            updatePreviewFrame(width, height, previewFrame);
            saveAppState();
            
            // Обновляем поля пользовательского размера
            if (customWidthInput) customWidthInput.value = width;
            if (customHeightInput) customHeightInput.value = height;
        });
    });

    // Применение пользовательского размера
    if (applyCustomSizeBtn && customWidthInput && customHeightInput) {
        applyCustomSizeBtn.addEventListener('click', () => {
            let width = parseInt(customWidthInput.value);
            let height = parseInt(customHeightInput.value);
            
            // Проверка и коррекция значений
            width = Math.min(Math.max(384, width), 2048);
            height = Math.min(Math.max(384, height), 2048);
            
            // Округление до ближайшего кратного 32
            width = Math.round(width / 32) * 32;
            height = Math.round(height / 32) * 32;
            
            // Обновляем поля ввода корректными значениями
            customWidthInput.value = width;
            customHeightInput.value = height;
            
            // Обновляем appState и превью
            appState.selectedSize = { width, height };
            updateSizesButtonLabel();
            updatePreviewFrame(width, height, previewFrame);
            saveAppState();
            
            // Снимаем активное состояние со всех кнопок размеров
            ratioButtonsContainer.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
            
            // Проверяем, есть ли кнопка с таким же размером и делаем её активной
            const matchingButton = Array.from(ratioButtonsContainer.querySelectorAll('.ratio-btn')).find(
                btn => parseInt(btn.dataset.width) === width && parseInt(btn.dataset.height) === height
            );
            if (matchingButton) {
                matchingButton.classList.add('active');
            }
            
            // Показываем уведомление
            showNotification(`Установлен пользовательский размер: ${width}×${height}`, 'success');
        });
    }

    updateSizesButtonLabel();
    
    // Обновить значения полей пользовательского размера при открытии модалки
    if (sizesBtn) {
        sizesBtn.addEventListener('click', () => {
            if (sizesModal.classList.contains('open')) {
                // Устанавливаем активную кнопку на основе appState
                ratioButtonsContainer.querySelectorAll('.ratio-btn').forEach(btn => {
                    btn.classList.toggle('active', 
                        parseInt(btn.dataset.width) === appState.selectedSize.width &&
                        parseInt(btn.dataset.height) === appState.selectedSize.height
                    );
                });
                updatePreviewFrame(appState.selectedSize.width, appState.selectedSize.height, previewFrame);
                
                // Обновляем поля пользовательского размера
                if (customWidthInput) customWidthInput.value = appState.selectedSize.width;
                if (customHeightInput) customHeightInput.value = appState.selectedSize.height;
                
                // По умолчанию показываем все категории
                if (categoryTabs) {
                    categoryTabs.forEach(t => t.classList.remove('active'));
                    const allTab = document.querySelector('.size-category-tab[data-category="all"]');
                    if (allTab) allTab.classList.add('active');
                }
                
                if (ratioCategories) {
                    ratioCategories.forEach(cat => cat.style.display = 'block');
                }
            }
        });
    }
}

function updatePreviewFrame(width, height, frameElement) {
    if (!frameElement) return;
    const container = frameElement.parentElement; // ratio-preview-box
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    let frameW, frameH;
    const aspectRatio = width / height;
    const containerAspectRatio = containerWidth / containerHeight;

    if (aspectRatio > containerAspectRatio) { // Шире, чем контейнер
        frameW = containerWidth * 0.9; // 90% ширины контейнера
        frameH = frameW / aspectRatio;
    } else { // Выше или такой же пропорции, как контейнер
        frameH = containerHeight * 0.9; // 90% высоты контейнера
        frameW = frameH * aspectRatio;
    }
    
    frameElement.style.width = `${frameW}px`;
    frameElement.style.height = `${frameH}px`;
    frameElement.style.left = `${(containerWidth - frameW) / 2}px`;
    frameElement.style.top = `${(containerHeight - frameH) / 2}px`;
}

function updateSizesButtonLabel() {
    if (!sizesBtn) return;
    sizesBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
        </svg>
        <span>Размер: ${appState.selectedSize.width}×${appState.selectedSize.height}</span>
    `;
}

// --- Модальное окно количества генераций ---
function initCountModalListeners() {
    if (!countModal) return;
    const countOptionsContainer = document.getElementById('count-options-container');
    
    countOptionsContainer.querySelectorAll('.count-option').forEach(opt => {
        opt.classList.toggle('active', parseInt(opt.dataset.count) === appState.generationCount);
        // Блокировка опций > 1 если выбрана модель gptimage
        if (appState.selectedModel === 'gptimage' && parseInt(opt.dataset.count) > 1) {
            opt.classList.add('disabled');
        } else {
            opt.classList.remove('disabled');
        }

        opt.addEventListener('click', function() {
            if (this.classList.contains('disabled')) return;
            appState.generationCount = parseInt(this.dataset.count);
            countOptionsContainer.querySelectorAll('.count-option').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateCountButtonLabel();
            saveAppState();
            closeModal(countModal);
        });
    });
    updateCountButtonLabel();
}

function updateCountButtonLabel() {
    if (!countBtn) return;
    countBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z"/>
        </svg>
        <span>Количество: ${appState.generationCount}</span>
    `;
}

// --- Обновление всех меток кнопок опций ---
function updateOptionButtonLabels() {
    updateModelsButtonLabel();
    updateStylesButtonLabel();
    updateTrendsButtonLabel();
    updateSizesButtonLabel();
    updateCountButtonLabel();
}

// --- Управление состоянием загрузки ---
let loadingMessageElement = null;
const generateButton = document.getElementById('generate-btn');

function setLoadingState(message) {
    if (!loadingMessageElement) {
        loadingMessageElement = document.createElement('div');
        loadingMessageElement.className = 'loading-indicator'; // Нужен CSS для этого класса
        loadingMessageElement.style.cssText = `
            position: fixed;
            bottom: ${generatorPanel.offsetHeight + 10}px; /* Над панелью генератора */
            left: 50%;
            transform: translateX(-50%);
            background-color: var(--bg-card);
            color: var(--text-secondary);
            padding: 10px 20px;
            border-radius: var(--border-radius);
            box-shadow: var(--card-shadow);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: opacity 0.3s, bottom 0.3s;
        `;
        const spinner = document.createElement('div');
        spinner.className = 'loader'; // Используем существующий класс лоадера
        spinner.style.width = '20px';
        spinner.style.height = '20px';
        spinner.style.borderWidth = '2px';
        spinner.style.margin = '0';
        loadingMessageElement.appendChild(spinner);
        const textSpan = document.createElement('span');
        loadingMessageElement.appendChild(textSpan);
        document.body.appendChild(loadingMessageElement);
    }
    
    loadingMessageElement.querySelector('span').textContent = message;
    loadingMessageElement.style.opacity = '1';
    loadingMessageElement.style.display = 'flex';
    if (generateButton) generateButton.disabled = true;

    // Обновляем позицию индикатора загрузки
    const panelWrapperForLoading = document.getElementById('generator-panel-wrapper');
    if (loadingMessageElement && generatorHandle) { // Убедимся, что loadingMessageElement существует
        let handleBottomPosition = generatorHandle.offsetHeight; // Базовая позиция над ручкой
        if (panelWrapperForLoading && panelWrapperForLoading.classList.contains('expanded')) {
            // Если панель раскрыта, индикатор должен быть над ней, т.е. над ручкой, которая уже над панелью
            const panelRect = panelWrapperForLoading.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            handleBottomPosition = Math.max(windowHeight - panelRect.top + 5, generatorHandle.offsetHeight + 5);
        }
        loadingMessageElement.style.bottom = `${handleBottomPosition}px`;
    }
}

function clearLoadingState() {
    if (loadingMessageElement) {
        loadingMessageElement.style.opacity = '0';
        // setTimeout(() => { // Скрыть после анимации
        //     if(loadingMessageElement) loadingMessageElement.style.display = 'none';
        // }, 300);
    }
    if (generateButton) generateButton.disabled = false;
}

/**
 * Обновляет UI панели результата генерации (если она будет).
 * Пока что эта функция не нужна, так как результат сразу идет в галерею.
 * Оставлена как заглушка.
 * @param {string|null} imageUrl - URL сгенерированного изображения.
 * @param {string|null} seed - Сид использованный для генерации.
 */
function updateGeneratedImageUI(imageUrl, seed) {
    // Пока что эта панель не используется в новом дизайне.
    // Изображения сразу добавляются в галерею.
    // Если будет отдельная панель "Результат" как в старом дизайне, здесь будет ее обновление.
    console.log("Обновление UI результата:", imageUrl, seed);
    if (!imageUrl) {
        // Очистить область результата, если есть
    }
}

// --- Модальное окно подтверждения ---
function showConfirmDialog(message, title = 'Подтверждение', confirmCallback, cancelCallback = null) {
    const modal = document.getElementById('confirm-dialog-modal');
    const titleElement = document.getElementById('confirm-dialog-title');
    const messageElement = document.getElementById('confirm-dialog-message');
    const confirmBtn = document.getElementById('confirm-dialog-confirm-btn');
    const cancelBtn = document.getElementById('confirm-dialog-cancel-btn');
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    
    // Сбрасываем предыдущие обработчики
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Устанавливаем новые обработчики
    newConfirmBtn.addEventListener('click', () => {
        closeModal(modal);
        if (confirmCallback) confirmCallback();
    });
    
    newCancelBtn.addEventListener('click', () => {
        closeModal(modal);
        if (cancelCallback) cancelCallback();
    });
    
    modal.classList.add('open');
}

/**
 * Сбрасывает все настройки приложения к значениям по умолчанию.
 */
function resetToDefaultSettings() {
    // Сброс промта
    if (promptInput) {
        promptInput.value = '';
        autoResizePromptInput.call(promptInput);
    }
    
    // Сброс настроек модели
    if (appState.imageModelsData && appState.imageModelsData.defaultImageModel && 
        appState.availableImageModelsFromAPI.includes(appState.imageModelsData.defaultImageModel)) {
        selectModel(appState.imageModelsData.defaultImageModel);
    } else if (appState.availableImageModelsFromAPI.length > 0) {
        selectModel(appState.availableImageModelsFromAPI[0]);
    }
    
    // Сброс стиля и тренда
    appState.selectedStyle = null;
    appState.selectedTrend = null;
    
    // Сброс размера
    appState.selectedSize = { width: 1024, height: 1024 };
    
    // Сброс количества генераций
    appState.generationCount = 1;
    
    // Сброс настроек seed
    appState.useRandomSeed = true;
    appState.currentSeedValue = '12345';
    
    // Включение улучшения промта
    appState.enhancePrompt = true;
    
    // Сброс настроек сохранения элементов
    appState.preserveSettings = {
        composition: true,
        face: true,
        colors: true
    };
    
    // Сброс отредактированного промта
    appState.editedFinalPrompt = '';
    appState.lastRawFinalPrompt = '';
    
    // Обновление UI
    updateOptionButtonLabels();
    
    // Обновление UI элементов настроек
    const seedInputElement = document.getElementById('seed-input');
    const randomSeedToggleElement = document.getElementById('random-seed-toggle');
    const enhancePromptToggleElement = document.getElementById('enhance-prompt-toggle');
    
    if(seedInputElement) seedInputElement.value = appState.currentSeedValue;
    if(randomSeedToggleElement) randomSeedToggleElement.checked = appState.useRandomSeed;
    if(enhancePromptToggleElement) enhancePromptToggleElement.checked = appState.enhancePrompt;
    
    // Обновление отображения текущего seed
    const currentSeedDisplay = document.getElementById('current-seed-display');
    if(currentSeedDisplay) currentSeedDisplay.textContent = 'Случайный';
    
    // Обновление чекбоксов сохранения элементов
    const compCheckbox = document.getElementById('preserve-composition');
    const faceCheckbox = document.getElementById('preserve-face');
    const colorsCheckbox = document.getElementById('preserve-colors');
    if(compCheckbox) compCheckbox.checked = true;
    if(faceCheckbox) faceCheckbox.checked = true;
    if(colorsCheckbox) colorsCheckbox.checked = true;
    
    // Сохранение обновленного состояния
    saveAppState();
    
    // Импортируем модуль references.js для очистки референсов
    import('./references.js').then(referencesModule => {
        if (referencesModule.setUploadedReferences) {
            referencesModule.setUploadedReferences([]);
        }
    });
}

export {
    initUI,
    showNotification,
    renderGallery,
    openImageDetailsModal,
    showPromptPreviewModal,
    updateGeneratedImageUI,
    setLoadingState,
    clearLoadingState,
	showConfirmDialog,
	resetToDefaultSettings,
    updateOptionButtonLabels,
    // Переэкспортируем, чтобы main.js мог инициализировать их после загрузки данных
    initModelsModalListeners, 
    initStylesModalListeners,
    initTrendsModalListeners,
    selectModel, // Для установки дефолтной модели
    selectStyle, // Для установки дефолтного стиля
    selectTrend // Для установки дефолтного тренда
};

// --- END OF FILE jl-studio.art/gen-img-ref/js/ui.js ---