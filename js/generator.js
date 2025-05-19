// --- START OF FILE jl-studio.art/gen-img-ref/js/generator.js ---
import { generateImage, processTextForPrompt } from './api.js';
import { getReferenceDescriptions } from './references.js';
import { showNotification, showPromptPreviewModal, updateGeneratedImageUI, setLoadingState, clearLoadingState } from './ui.js';
import { appState, saveGeneratedImageToHistory } from './main.js'; // appState для доступа к текущим настройкам

let lastGeneratedSettings = null; // Для кнопки "Регенерация"
let isGenerating = false; // Флаг, чтобы предотвратить многократные запуски

/**
 * Инициализация обработчиков событий для генератора.
 */
function initGenerator() {
    const generateBtn = document.getElementById('generate-btn');
    const previewPromptBtnMain = document.getElementById('preview-prompt-btn-main');

    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateClick);
    }
    if (previewPromptBtnMain) {
        previewPromptBtnMain.addEventListener('click', handlePreviewPromptClick);
    }
}

/**
 * Обработчик клика по кнопке "Предпросмотр промта".
 */
async function handlePreviewPromptClick() {
    if (isGenerating) {
        showNotification('Пожалуйста, подождите завершения текущей операции.', 'warning');
        return;
    }
    isGenerating = true; // Блокируем на время предпросмотра, т.к. он тоже может быть долгим
    setLoadingState('Анализируем и формируем промт...');

    try {
        const finalPrompt = await assembleFinalPrompt(true); // true - для режима предпросмотра (не сохраняем в lastGeneratedSettings)
        if (finalPrompt) {
            showPromptPreviewModal(finalPrompt, false); // false - не в режиме редактирования
        } else {
            showNotification('Не удалось сформировать промт. Проверьте референсы и пользовательский ввод.', 'warning');
        }
    } catch (error) {
        console.error("Ошибка при предпросмотре промта:", error);
        showNotification(`Ошибка предпросмотра: ${error.message}`, 'error');
    } finally {
        clearLoadingState();
        isGenerating = false;
    }
}

/**
 * Обработчик клика по кнопке "Сгенерировать".
 */
async function handleGenerateClick() {
    if (isGenerating) {
        showNotification('Генерация уже запущена. Пожалуйста, подождите.', 'warning');
        return;
    }

    const promptInput = document.getElementById('prompt-input');
    if (appState.references.length === 0 && !promptInput.value.trim() && !appState.selectedStyle && !appState.selectedTrend) {
        showNotification('Пожалуйста, добавьте референс, введите промт, выберите стиль или тренд.', 'warning');
        return;
    }

    isGenerating = true;
    setLoadingState('Формируем финальный промт...');
    document.getElementById('generate-btn').disabled = true;


    try {
        const finalPrompt = await assembleFinalPrompt(false); // false - не режим предпросмотра

        if (!finalPrompt || !finalPrompt.trim()) {
            showNotification('Не удалось сформировать промт для генерации.', 'error');
            clearLoadingState();
            document.getElementById('generate-btn').disabled = false;
            isGenerating = false;
            return;
        }
        
        // Сохраняем настройки для возможной регенерации
        lastGeneratedSettings = {
            prompt: finalPrompt,
            width: appState.selectedSize.width,
            height: appState.selectedSize.height,
            model: appState.selectedModel,
            // enhance: appState.enhancePrompt, // enhance теперь часть processTextForPrompt
            // seed будет генерироваться/браться из input при вызове generateImageWithSettings
        };
        
        // Генерируем изображения в зависимости от выбранного количества
        const numImagesToGenerate = appState.generationCount;
        const generatedImageUrls = [];
        const generatedSeeds = [];

        setLoadingState(`Генерируем ${numImagesToGenerate} ${numImagesToGenerate > 1 ? 'изображений' : 'изображение'}... (0/${numImagesToGenerate})`);

        for (let i = 0; i < numImagesToGenerate; i++) {
            setLoadingState(`Генерируем ${numImagesToGenerate} ${numImagesToGenerate > 1 ? 'изображений' : 'изображение'}... (${i + 1}/${numImagesToGenerate})`);
            
            const currentSeed = appState.useRandomSeed ? Math.floor(Math.random() * 10000000000) : parseInt(appState.currentSeedValue) || 0;
            if (!appState.useRandomSeed && numImagesToGenerate > 1) {
                // Если не случайный сид и генерируем несколько, то для последующих сид увеличиваем
                appState.currentSeedValue = (currentSeed + i).toString(); 
            } else if (appState.useRandomSeed) {
                 appState.currentSeedValue = currentSeed.toString(); // Обновляем для отображения
            }


            const imageUrl = await generateImage(finalPrompt, {
                width: appState.selectedSize.width,
                height: appState.selectedSize.height,
                seed: appState.currentSeedValue,
                model: appState.selectedModel,
                nologo: true
            });

            if (imageUrl) {
                generatedImageUrls.push(imageUrl);
                generatedSeeds.push(appState.currentSeedValue);

                // Сохраняем в историю сразу после генерации каждого изображения
                const imageData = {
                    id: `img-${Date.now()}-${i}`,
                    src: imageUrl,
                    prompt: finalPrompt, // Сохраняем финальный промт
                    model: appState.selectedModel,
                    width: appState.selectedSize.width,
                    height: appState.selectedSize.height,
                    seed: appState.currentSeedValue,
                    timestamp: Date.now(),
                    references: JSON.parse(JSON.stringify(appState.references)), // Глубокое копирование
                    style: appState.selectedStyle,
                    trend: appState.selectedTrend ? {id: appState.selectedTrend.id, name: appState.selectedTrend.name } : null,
                    enhancePrompt: appState.enhancePrompt,
                    preserveSettings: {
                        composition: document.getElementById('preserve-composition')?.checked,
                        face: document.getElementById('preserve-face')?.checked,
                        colors: document.getElementById('preserve-colors')?.checked,
                    }
                };
                saveGeneratedImageToHistory(imageData);
            } else {
                 showNotification(`Не удалось сгенерировать изображение ${i+1}.`, 'error');
            }
        }

        if (generatedImageUrls.length > 0) {
            // Отображаем последнее сгенерированное изображение (или первое, если это предпочтительнее)
            // В данном случае, если генерируется несколько, в UI панели результата не будет превью.
            // Они все появятся в галерее.
            // Если генерируется одно, то оно появится и в галерее и в UI панели результата.
            if (numImagesToGenerate === 1) {
                 updateGeneratedImageUI(generatedImageUrls[0], generatedSeeds[0]);
            } else {
                 updateGeneratedImageUI(null, null); // Очищаем панель результата, если было много генераций
                 showNotification(`${generatedImageUrls.length} из ${numImagesToGenerate} изображений успешно сгенерированы и добавлены в галерею.`, 'success');
            }
        } else {
            showNotification('Не удалось сгенерировать ни одного изображения.', 'error');
            updateGeneratedImageUI(null, null); // Очищаем
        }

    } catch (error) {
        console.error("Ошибка при генерации изображения:", error);
        showNotification(`Критическая ошибка генерации: ${error.message}`, 'error');
        updateGeneratedImageUI(null, null);
    } finally {
        clearLoadingState();
        document.getElementById('generate-btn').disabled = false;
        isGenerating = false;
    }
}


/**
 * Собирает финальный промт из всех источников.
 * @param {boolean} isPreviewMode - Если true, то не используется отредактированный промт, а генерируется заново.
 * @returns {Promise<string|null>} Собранный и обработанный промт или null.
 */
async function assembleFinalPrompt(isPreviewMode = false) {
    const promptInput = document.getElementById('prompt-input').value.trim();
    const enhanceEnabled = document.getElementById('enhance-prompt-toggle')?.checked || false;

    // Если есть отредактированный промт и это не режим предпросмотра, используем его
    if (!isPreviewMode && appState.editedFinalPrompt) {
        console.log("Используется отредактированный промт:", appState.editedFinalPrompt);
        return appState.editedFinalPrompt;
    }

    let basePromptParts = [];

    // 1. Описания референсов
    if (appState.references.length > 0) {
        const refDescriptions = await getReferenceDescriptions();
        refDescriptions.forEach(ref => {
            if (ref.description) {
                // Добавляем тип референса для контекста, если он не "Стиль"
                // (т.к. стиль применяется отдельно или уже включен в описание)
                let prefix = "";
                if (ref.type !== "Стиль" && ref.type !== "Другое") {
                     prefix = `${ref.type}: `;
                } else if (ref.type === "Другое" && ref.sensitivity > 0) { // Для "Другое" с описанием
                     prefix = `Described as: `;
                }
                basePromptParts.push(prefix + ref.description);
            }
        });
    }
    
    // 2. Выбранный тренд (имеет приоритет над стилем, если выбран)
    if (appState.selectedTrend && appState.selectedTrend.prompt) {
        let trendPrompt = appState.selectedTrend.prompt;
        // Замена плейсхолдеров в тренде
        const characterDescs = appState.references.filter(r => r.type === 'Персонаж' && r.description).map(r => r.description);
        const locationDescs = appState.references.filter(r => r.type === 'Место' && r.description).map(r => r.description);
        const objectDescs = appState.references.filter(r => r.type === 'Предмет' && r.description).map(r => r.description);

        trendPrompt = trendPrompt.replace(/\[CHARACTER_NAME\]|\[CHARACTER\]|\[PERSON\]|\[SUBJECT\]/gi, characterDescs.join(', ') || "a character");
        trendPrompt = trendPrompt.replace(/\[ITEM_NAME\]|\[ITEM\]|\[PRODUCT\]|\[OBJECT\]/gi, objectDescs.join(', ') || "an item");
        trendPrompt = trendPrompt.replace(/\[ITEM_DETAILS\]/gi, objectDescs.join('; ') || "details about the item");
        trendPrompt = trendPrompt.replace(/\[LOCATION\]|\[BACKGROUND_DESC\]/gi, locationDescs.join(', ') || "a setting");
        trendPrompt = trendPrompt.replace(/\[TEXT\]/gi, promptInput || "Sample Text"); // Используем пользовательский текст для [TEXT]
        trendPrompt = trendPrompt.replace(/\[COLOR1\]/gi, "blue"); // Дефолтные значения, можно сделать настраиваемыми
        trendPrompt = trendPrompt.replace(/\[COLOR2\]/gi, "purple");
        // Удаляем оставшиеся необработанные плейсхолдеры
        trendPrompt = trendPrompt.replace(/\[[^\]]+\]/g, "").trim();
        basePromptParts.push(trendPrompt);
    }
    // 3. Пользовательский промт (добавляется, если нет тренда или если тренд не должен его полностью заменять)
    // Если есть тренд, пользовательский промт может быть добавлен как дополнительная деталь,
    // но основной трендовый промт уже в basePromptParts.
    // Если нет тренда, пользовательский промт - основное.
    if (promptInput) {
        // Если есть тренд, то пользовательский промт добавляется как дополнение.
        // Если нет тренда, то он является основной частью.
        if (appState.selectedTrend && appState.selectedTrend.prompt) {
            basePromptParts.push(`Additional details: ${promptInput}`);
        } else {
            basePromptParts.push(promptInput);
        }
    }

    // 4. Выбранный стиль (если нет тренда и выбран стиль)
    if (!appState.selectedTrend && appState.selectedStyle && appState.selectedStyle.prompt) {
        basePromptParts.push(appState.selectedStyle.prompt);
    }
    
    let combinedPrompt = basePromptParts.join(". ").replace(/\.+/g, ".").replace(/\s{2,}/g, " ").trim();

    if (!combinedPrompt && appState.references.length === 0) {
        showNotification('Промт пуст. Добавьте описание или референсы.', 'warning');
        return null;
    }
    if (!combinedPrompt && appState.references.length > 0) {
        // Если есть только референсы, но их описания не получены
        showNotification('Не удалось получить описания для референсов. Попробуйте еще раз или добавьте текстовый промт.', 'warning');
        return null;
    }

    // 5. Финальная обработка: перевод на английский и улучшение (если включено)
    // Определяем контекст стиля для processTextForPrompt
    let styleContextForProcessing = null;
    if (appState.selectedTrend && appState.selectedTrend.name) { // Тренд имеет приоритет для контекста
        styleContextForProcessing = appState.selectedTrend.name;
    } else if (appState.selectedStyle && appState.selectedStyle.prompt) {
        styleContextForProcessing = appState.selectedStyle.prompt; // или сам промт стиля
    }


    const finalProcessedPrompt = await processTextForPrompt(
        combinedPrompt,
        enhanceEnabled,
        appState.config.textProcessingModel,
        styleContextForProcessing 
    );
    
    console.log("Собранный промт (до финальной обработки):", combinedPrompt);
    console.log("Финальный обработанный промт:", finalProcessedPrompt);
    
    // Сохраняем "сырой" финальный промт перед его возможным редактированием пользователем
    if (!isPreviewMode) {
        appState.lastRawFinalPrompt = finalProcessedPrompt;
        appState.editedFinalPrompt = ''; // Сбрасываем отредактированный, т.к. сгенерировали новый "сырой"
    }


    return finalProcessedPrompt;
}

/**
 * Запускает регенерацию последнего изображения или генерацию с текущими настройками, но новым сидом.
 * @param {object|null} settings - Настройки для регенерации (из истории). Если null, используются lastGeneratedSettings.
 */
async function regenerateLastImage(settings = null) {
    if (isGenerating) {
        showNotification('Предыдущая генерация еще не завершена.', 'warning');
        return;
    }
    const settingsToUse = settings || lastGeneratedSettings;

    if (!settingsToUse || !settingsToUse.prompt) {
        showNotification('Нет данных для регенерации. Сначала сгенерируйте изображение.', 'warning');
        return;
    }

    isGenerating = true;
    setLoadingState('Регенерация изображения...');
    document.getElementById('generate-btn').disabled = true; // Блокируем основную кнопку

    try {
        const newSeed = Math.floor(Math.random() * 10000000000); // Всегда новый случайный сид для регенерации

        // Если регенерируем из истории, применяем настройки из истории
        if (settings) {
            appState.selectedSize = { width: settings.width, height: settings.height };
            appState.selectedModel = settings.model;
            // appState.enhancePrompt = settings.enhancePrompt; // enhance теперь часть processTextForPrompt
            document.getElementById('prompt-input').value = settings.prompt; // Показать оригинальный промт, если нужно
            // Не меняем референсы, стиль и тренд из appState, т.к. settings.prompt уже финальный
            // Если нужно полностью восстановить состояние, то это более сложная логика.
            // Пока что регенерация использует финальный промт из истории.
        }
        
        const imageUrl = await generateImage(settingsToUse.prompt, {
            width: settingsToUse.width,
            height: settingsToUse.height,
            seed: newSeed,
            model: settingsToUse.model,
            nologo: true
        });

        if (imageUrl) {
            updateGeneratedImageUI(imageUrl, newSeed.toString());
            // Сохраняем регенерированное изображение в историю
            const imageData = {
                id: `img-${Date.now()}`,
                src: imageUrl,
                prompt: settingsToUse.prompt,
                model: settingsToUse.model,
                width: settingsToUse.width,
                height: settingsToUse.height,
                seed: newSeed.toString(),
                timestamp: Date.now(),
                references: settings ? JSON.parse(JSON.stringify(settings.references)) : JSON.parse(JSON.stringify(appState.references)),
                style: settings ? settings.style : appState.selectedStyle,
                trend: settings ? settings.trend : (appState.selectedTrend ? {id: appState.selectedTrend.id, name: appState.selectedTrend.name } : null),
                enhancePrompt: settings ? settings.enhancePrompt : appState.enhancePrompt,
                 preserveSettings: settings ? settings.preserveSettings : {
                    composition: document.getElementById('preserve-composition')?.checked,
                    face: document.getElementById('preserve-face')?.checked,
                    colors: document.getElementById('preserve-colors')?.checked,
                }
            };
            saveGeneratedImageToHistory(imageData);

            // Обновляем lastGeneratedSettings на случай повторной регенерации уже регенерированного
            lastGeneratedSettings = {
                prompt: settingsToUse.prompt,
                width: settingsToUse.width,
                height: settingsToUse.height,
                model: settingsToUse.model,
            };

        } else {
            showNotification('Не удалось регенерировать изображение.', 'error');
            updateGeneratedImageUI(null, null);
        }

    } catch (error) {
        console.error("Ошибка при регенерации:", error);
        showNotification(`Ошибка регенерации: ${error.message}`, 'error');
        updateGeneratedImageUI(null, null);
    } finally {
        clearLoadingState();
        document.getElementById('generate-btn').disabled = false;
        isGenerating = false;
    }
}


export { initGenerator, assembleFinalPrompt, regenerateLastImage, handleGenerateClick };

// --- END OF FILE jl-studio.art/gen-img-ref/js/generator.js ---