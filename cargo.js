// cargo.js - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ С РАБОЧЕЙ СТАТИСТИКОЙ

let cargoList = [];
let currentCargoType = 'euro-pallet';
let currentPackagingType = 'none';
let currentPackagingCount = 0;
let currentPhotos = [];

// Начальные значения для параметров
let cargoParams = {
    quantity: 1,
    weight: 10,
    length: 120,
    width: 80,
    height: 30
};

// Карта для группировки одинаковых грузов
let groupedCargo = {};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Инициализация cargo.js...');
    
    loadCargoList();
    selectCargoType('euro-pallet');
    selectPackagingType('none');
    updateCurrentStats();
    updateTotalStatsFixed(); // Используем исправленную функцию
    loadEmployeeName();
    setupInputHandlers();
    initPhotoHandler();
    initMobileButtons();
    
    console.log('cargo.js инициализирован. Грузов в списке:', cargoList.length);
});

// Инициализация обработчика фото
function initPhotoHandler() {
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoSelection);
    }
}

// Настройка обработчиков для полей ввода
function setupInputHandlers() {
    const numberInputs = document.querySelectorAll('.param-input');
    numberInputs.forEach(input => {
        input.addEventListener('input', function() {
            const param = this.id.replace('Input', '');
            handleInputChange(param, this.value);
        });
        
        input.addEventListener('blur', function() {
            const param = this.id.replace('Input', '');
            validateAndUpdateInput(param, this);
        });
    });
}

// Функция для загрузки имени сотрудника
function loadEmployeeName() {
    console.log('Загрузка данных сотрудника...');
    
    const authData = localStorage.getItem('employeeAuth');
    if (authData) {
        try {
            const employee = JSON.parse(authData);
            const nameElement = document.getElementById('employeeName');
            
            if (nameElement) {
                if (employee.fullName) {
                    nameElement.textContent = employee.fullName;
                } else if (employee.lastName && employee.name) {
                    nameElement.textContent = `${employee.lastName} ${employee.name}`;
                } else if (employee.name) {
                    nameElement.textContent = employee.name;
                } else {
                    nameElement.textContent = 'Сотрудник';
                }
            }
        } catch (e) {
            console.error('Ошибка парсинга данных сотрудника:', e);
            document.getElementById('employeeName').textContent = 'Ошибка данных';
        }
    } else {
        document.getElementById('employeeName').textContent = 'Неавторизован';
        setTimeout(() => {
            showNotification('Требуется авторизация', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }, 2000);
    }
}

// Функция выхода
function logout() {
    console.log('Выход из системы...');
    
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('employeeAuth');
        localStorage.removeItem('cargoList');
        
        showNotification('Выход выполнен', 'info');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// Выбор типа груза
function selectCargoType(type) {
    console.log('Выбор типа груза:', type);
    currentCargoType = type;
    
    document.querySelectorAll('.cargo-type-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`.cargo-type-item[data-type="${type}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    switch(type) {
        case 'euro-pallet':
            cargoParams.length = 120;
            cargoParams.width = 80;
            cargoParams.height = 30;
            cargoParams.weight = 10;
            break;
        case 'american-pallet':
            cargoParams.length = 120;
            cargoParams.width = 100;
            cargoParams.height = 30;
            cargoParams.weight = 15;
            break;
        case 'box':
            cargoParams.length = 60;
            cargoParams.width = 40;
            cargoParams.height = 40;
            cargoParams.weight = 5;
            break;
        case 'non-standard':
            break;
    }
    
    updateAllInputs();
    updateCurrentStats();
}

// Выбор типа упаковки
function selectPackagingType(type) {
    console.log('Выбор типа упаковки:', type);
    currentPackagingType = type;
    
    document.querySelectorAll('.packaging-type-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`.packaging-type-item[data-packaging-type="${type}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    const packagingTypeElement = document.getElementById('currentPackagingType');
    if (packagingTypeElement) {
        packagingTypeElement.textContent = getPackagingTypeName(type);
    }
    
    if (type === 'none') {
        currentPackagingCount = 0;
        updatePackagingCountDisplay();
    }
}

// Получение названия типа упаковки
function getPackagingTypeName(type) {
    switch(type) {
        case 'none': return 'Нет';
        case 'obreshetka': return 'Обрешетка';
        case 'paletnyy-bort': return 'Паллетный борт';
        default: return 'Неизвестно';
    }
}

// Обновление отображения количества упаковки
function updatePackagingCountDisplay() {
    const packagingCountElement = document.getElementById('currentPackagingCount');
    if (packagingCountElement) {
        packagingCountElement.textContent = currentPackagingCount + ' шт';
    }
}

// Изменение параметра
function changeParam(param, delta) {
    console.log('Изменение параметра:', param, delta);
    
    const button = event?.target || document.querySelector(`.param-btn.${delta > 0 ? 'plus' : 'minus'}`);
    if (button) {
        button.classList.add('active');
        setTimeout(() => button.classList.remove('active'), 300);
    }
    
    if (param === 'quantity') {
        cargoParams[param] += delta;
        
        if (cargoParams[param] < 1) {
            cargoParams[param] = 1;
        }
        
        if (cargoParams[param] > 100) {
            cargoParams[param] = 100;
        }
    } else {
        cargoParams[param] += delta;
        
        if (cargoParams[param] < 10) {
            cargoParams[param] = 10;
        } else if (cargoParams[param] > 1000) {
            cargoParams[param] = 1000;
        }
    }
    
    const input = document.getElementById(param + 'Input');
    if (input) {
        input.value = cargoParams[param];
    }
    
    updateCurrentStats();
    showNotification(`${getParamName(param)}: ${cargoParams[param]}`, 'info');
}

// Обновление всех полей ввода
function updateAllInputs() {
    document.getElementById('quantityInput').value = cargoParams.quantity;
    document.getElementById('lengthInput').value = cargoParams.length;
    document.getElementById('widthInput').value = cargoParams.width;
    document.getElementById('heightInput').value = cargoParams.height;
}

// Расчет объема
function calculateVolume() {
    return (cargoParams.length * cargoParams.width * cargoParams.height) / 1000000;
}

// Обновление текущей статистики
function updateCurrentStats() {
    console.log('Обновление текущей статистики:', cargoParams);
    
    const volumePerItem = calculateVolume();
    const totalVolume = volumePerItem * cargoParams.quantity;
    
    const currentQuantityElement = document.getElementById('currentQuantity');
    if (currentQuantityElement) {
        currentQuantityElement.textContent = cargoParams.quantity + ' мест';
    }
    
    const currentQuantityDisplay = document.getElementById('currentQuantityDisplay');
    if (currentQuantityDisplay) {
        const placeWord = cargoParams.quantity === 1 ? 'место' : (cargoParams.quantity < 5 ? 'места' : 'мест');
        currentQuantityDisplay.textContent = `Текущее: ${cargoParams.quantity} ${placeWord}`;
    }
    
    const currentVolumeElement = document.getElementById('currentVolume');
    if (currentVolumeElement) {
        currentVolumeElement.textContent = totalVolume.toFixed(3) + ' м³';
    }
    
    const currentTotalWeightElement = document.getElementById('currentTotalWeight');
    if (currentTotalWeightElement) {
        currentTotalWeightElement.textContent = cargoParams.weight + ' кг';
    }
}

// Редактирование веса с клавиатурой
function editWeight() {
    console.log('Открытие клавиатуры для редактирования веса');
    
    const keyboard = document.getElementById('weightKeyboard');
    const input = document.getElementById('weightKeyboardInput');
    
    if (!keyboard || !input) {
        console.error('Не найдены элементы клавиатуры');
        return;
    }
    
    // Устанавливаем текущее значение
    input.value = cargoParams.weight;
    
    // Показываем клавиатуру
    document.getElementById('weightKeyboardOverlay').style.display = 'block';
    setTimeout(() => {
        keyboard.classList.add('show');
    }, 10);
    
    // Фокус на input
    input.focus();
}

// Добавление цифры на клавиатуре
function addWeightDigit(digit) {
    const input = document.getElementById('weightKeyboardInput');
    if (!input) return;
    
    let currentValue = input.value;
    
    // Если текущее значение 0, заменяем его
    if (currentValue === '0' || currentValue === '') {
        currentValue = digit;
    } else {
        // Проверяем, чтобы не превышало максимальное значение
        if ((currentValue + digit).length <= 5) { // Максимум 5 цифр (до 99999 кг)
            currentValue += digit;
        }
    }
    
    input.value = currentValue;
}

// Удаление последней цифры
function removeWeightDigit() {
    const input = document.getElementById('weightKeyboardInput');
    if (!input) return;
    
    let currentValue = input.value;
    
    if (currentValue.length > 1) {
        currentValue = currentValue.slice(0, -1);
    } else {
        currentValue = '0';
    }
    
    input.value = currentValue;
}

// Очистка поля ввода
function clearWeightInput() {
    const input = document.getElementById('weightKeyboardInput');
    if (input) {
        input.value = '0';
    }
}

// Сохранение веса с клавиатуры
function saveWeightFromKeyboard() {
    const input = document.getElementById('weightKeyboardInput');
    if (!input) {
        console.error('Не найден input для веса');
        return;
    }
    
    let value = parseInt(input.value) || 0;
    
    // Проверяем границы
    if (value < 1) {
        value = 1;
        showNotification('Вес не может быть меньше 1 кг', 'warning');
    }
    if (value > 10000) {
        value = 10000;
        showNotification('Вес не может быть больше 10000 кг', 'warning');
    }
    
    // Сохраняем общий вес
    cargoParams.weight = value;
    
    // Обновляем отображение
    updateCurrentStats();
    
    // Закрываем клавиатуру
    closeWeightKeyboard();
    
    // Показываем уведомление
    showNotification(`Общий вес установлен: ${value} кг`, 'success');
}

// Закрытие клавиатуры
function closeWeightKeyboard() {
    const keyboard = document.getElementById('weightKeyboard');
    const overlay = document.getElementById('weightKeyboardOverlay');
    
    if (keyboard) {
        keyboard.classList.remove('show');
        setTimeout(() => {
            if (overlay) {
                overlay.style.display = 'none';
            }
        }, 300);
    }
}

// Обработчик выбора фото
function handlePhotoSelection(e) {
    console.log('Обработка выбора фото...');
    
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const photosContainer = document.getElementById('photosContainer');
        const placeholder = document.getElementById('photoPlaceholder');
        
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        if (!photosContainer) {
            const container = document.createElement('div');
            container.id = 'photosContainer';
            container.className = 'photos-container';
            document.querySelector('.photo-container-new').appendChild(container);
        } else {
            photosContainer.innerHTML = '';
        }
        
        currentPhotos = [];
        
        files.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const photoData = event.target.result;
                currentPhotos.push(photoData);
                
                const thumbnail = document.createElement('div');
                thumbnail.className = 'photo-thumbnail';
                
                const img = document.createElement('img');
                img.src = photoData;
                img.alt = `Фото ${index + 1}`;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '×';
                deleteBtn.className = 'photo-delete-btn';
                deleteBtn.onclick = function(e) {
                    e.stopPropagation();
                    currentPhotos.splice(index, 1);
                    thumbnail.remove();
                    showNotification(`Фото удалено (осталось: ${currentPhotos.length})`, 'info');
                    
                    if (currentPhotos.length === 0 && placeholder) {
                        placeholder.style.display = 'flex';
                    }
                };
                
                thumbnail.appendChild(img);
                thumbnail.appendChild(deleteBtn);
                document.getElementById('photosContainer').appendChild(thumbnail);
            };
            
            reader.onerror = function() {
                showNotification('Ошибка при загрузке фото', 'error');
            };
            
            reader.readAsDataURL(file);
        });
        
        showNotification(`Загружено ${files.length} фото`, 'success');
    }
}

// Открытие камеры/галереи
function openCamera() {
    console.log('Открытие камеры...');
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.value = '';
        photoInput.click();
    }
}

// Сохранение груза
function saveCargo() {
    console.log('Сохранение груза...');
    
    if (!validateCargoData()) {
        return;
    }
    
    const quantity = cargoParams.quantity;
    const totalWeight = cargoParams.weight;
    const volumePerItem = calculateVolume();
    const totalVolume = volumePerItem * quantity;
    const weightPerItem = totalWeight / quantity;
    
    const authData = localStorage.getItem('employeeAuth');
    let employeeInfo = {};
    
    if (authData) {
        try {
            employeeInfo = JSON.parse(authData);
        } catch (e) {
            console.error('Ошибка парсинга данных сотрудника:', e);
        }
    }
    
    const cargoKey = `${currentCargoType}_${cargoParams.length}_${cargoParams.width}_${cargoParams.height}_${totalWeight}_${currentPackagingType}_${currentPackagingCount}_${quantity}_${currentPhotos.length}`;
    
    for (let i = 0; i < quantity; i++) {
        const cargo = {
            id: Date.now() + i,
            type: currentCargoType,
            typeName: getCargoTypeName(currentCargoType),
            quantity: 1,
            weight: weightPerItem,
            totalWeight: totalWeight,
            length: cargoParams.length,
            width: cargoParams.width,
            height: cargoParams.height,
            volume: volumePerItem,
            totalVolume: totalVolume,
            packagingType: currentPackagingType,
            packagingCount: currentPackagingCount,
            packagingName: getPackagingTypeName(currentPackagingType),
            photos: [...currentPhotos],
            photo: currentPhotos[0] || null,
            timestamp: new Date().toLocaleString(),
            cargoKey: cargoKey,
            employeeId: employeeInfo.id || 'unknown',
            employeeName: employeeInfo.fullName || employeeInfo.name || 'Неизвестный сотрудник',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('ru-RU')
        };
        
        cargoList.push(cargo);
    }
    
    localStorage.setItem('cargoList', JSON.stringify(cargoList));
    updateCargoGrouping();
    updateTotalStatsFixed(); // Используем исправленную функцию
    resetPhotos();
    
    showNotification(`Сохранено ${quantity} мест(а) груза "${getCargoTypeName(currentCargoType)}" с ${currentPhotos.length} фото`, 'success');
}

// Валидация данных груза
function validateCargoData() {
    if (cargoParams.quantity < 1) {
        showNotification('Укажите количество мест', 'error');
        return false;
    }
    
    if (cargoParams.weight < 1) {
        showNotification('Укажите общий вес груза', 'error');
        return false;
    }
    
    if (cargoParams.length < 10 || cargoParams.width < 10 || cargoParams.height < 10) {
        showNotification('Размеры груза слишком маленькие', 'error');
        return false;
    }
    
    return true;
}

// Получение названия типа груза
function getCargoTypeName(type) {
    switch(type) {
        case 'euro-pallet': return 'Европаллет';
        case 'american-pallet': return 'Американский паллет';
        case 'box': return 'Коробка';
        case 'non-standard': return 'Нестандарт';
        default: return 'Неизвестно';
    }
}

// Обновление группировки грузов
function updateCargoGrouping() {
    groupedCargo = {};
    
    cargoList.forEach(cargo => {
        if (!groupedCargo[cargo.cargoKey]) {
            groupedCargo[cargo.cargoKey] = {
                count: 0,
                totalWeight: 0,
                totalVolume: 0,
                cargo: cargo
            };
        }
        
        groupedCargo[cargo.cargoKey].count++;
        groupedCargo[cargo.cargoKey].totalWeight += cargo.totalWeight;
        groupedCargo[cargo.cargoKey].totalVolume += cargo.totalVolume;
    });
    
    console.log('Группировка обновлена:', groupedCargo);
}

// Загрузка списка грузов
function loadCargoList() {
    const savedCargoList = localStorage.getItem('cargoList');
    if (savedCargoList) {
        try {
            cargoList = JSON.parse(savedCargoList);
            console.log('Загружено грузов из localStorage:', cargoList.length);
            updateCargoGrouping();
        } catch (e) {
            console.error('Ошибка при загрузке грузов из localStorage:', e);
            cargoList = [];
        }
    } else {
        cargoList = [];
    }
}

// Сброс фото
function resetPhotos() {
    currentPhotos = [];
    const photosContainer = document.getElementById('photosContainer');
    const placeholder = document.getElementById('photoPlaceholder');
    
    if (photosContainer) {
        photosContainer.innerHTML = '';
    }
    
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
    
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.value = '';
    }
}

// ОБНОВЛЕНИЕ ОБЩЕЙ СТАТИСТИКИ (исправленная версия)
function updateTotalStatsFixed() {
    console.log('Обновление общей статистики (исправленной)...');
    
    let totalGroups = cargoList.length;
    let totalItems = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    
    // Подсчет информации об упаковке
    let packagingSummary = {};
    
    cargoList.forEach(cargo => {
        totalItems += cargo.quantity;
        totalWeight += cargo.weight;
        totalVolume += cargo.volume * cargo.quantity;
        
        // Подсчет упаковки
        if (cargo.packagingType !== 'none' && cargo.packagingCount > 0) {
            const packagingName = cargo.packagingName || getPackagingTypeName(cargo.packagingType);
            if (!packagingSummary[packagingName]) {
                packagingSummary[packagingName] = 0;
            }
            packagingSummary[packagingName] += cargo.packagingCount;
        }
    });
    
    console.log('Статистика:', {
        totalGroups,
        totalItems,
        totalWeight,
        totalVolume,
        packagingSummary
    });
    
    // Обновляем элементы на странице
    const totalCargoCountElement = document.getElementById('totalCargoCount');
    const totalCargoGroupsElement = document.getElementById('totalCargoGroups');
    const totalWeightElement = document.getElementById('totalWeightValue');
    const totalVolumeElement = document.getElementById('totalVolumeValue');
    const totalPackagingElement = document.getElementById('totalPackagingInfo');
    
    if (totalCargoCountElement) {
        totalCargoCountElement.innerHTML = totalItems + ' мест <span class="total-info-arrow">›</span>';
    }
    
    if (totalCargoGroupsElement) {
        totalCargoGroupsElement.textContent = totalGroups;
    }
    
    if (totalWeightElement) {
        totalWeightElement.textContent = totalWeight.toFixed(1) + ' кг';
    }
    
    if (totalVolumeElement) {
        totalVolumeElement.textContent = totalVolume.toFixed(3) + ' м³';
    }
    
    if (totalPackagingElement) {
        if (Object.keys(packagingSummary).length === 0) {
            totalPackagingElement.textContent = 'Нет';
        } else {
            let packagingTexts = [];
            for (let type in packagingSummary) {
                packagingTexts.push(`${type}: ${packagingSummary[type]} шт`);
            }
            totalPackagingElement.textContent = packagingTexts.join(', ');
        }
    }
    
    console.log('Общая статистика обновлена');
}

// Переопределяем старую функцию если она вызывается где-то
window.updateTotalStats = updateTotalStatsFixed;

// Показать окно статистики грузов
function showCargoStatsPopup() {
    updateCargoGrouping();
    
    const itemsContainer = document.getElementById('cargoStatsItems');
    const totalsContainer = document.getElementById('cargoStatsTotals');
    
    if (itemsContainer) itemsContainer.innerHTML = '';
    if (totalsContainer) totalsContainer.innerHTML = '';
    
    if (cargoList.length === 0) {
        itemsContainer.innerHTML = '<div class="cargo-stats-empty">Нет сохраненных грузов</div>';
        return;
    }
    
    let totalPlaces = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    
    let cargoTypesInPopup = {};
    
    Object.keys(groupedCargo).forEach(key => {
        const group = groupedCargo[key];
        const cargo = group.cargo;
        
        totalPlaces += group.count;
        totalWeight += group.totalWeight;
        totalVolume += group.totalVolume;
        
        if (!cargoTypesInPopup[cargo.type]) {
            cargoTypesInPopup[cargo.type] = {
                name: cargo.typeName,
                count: 0,
                places: 0,
                weight: 0
            };
        }
        cargoTypesInPopup[cargo.type].count++;
        cargoTypesInPopup[cargo.type].places += group.count;
        cargoTypesInPopup[cargo.type].weight += group.totalWeight;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cargo-stats-item';
        
        // Создаем HTML для упаковки
        let packagingHTML = '';
        if (cargo.packagingType !== 'none') {
            packagingHTML = `
                <div class="cargo-stats-item-detail packaging-detail">
                    <span class="detail-label">Упаковка:</span>
                    <span class="detail-value packaging-value">${cargo.packagingName} (${cargo.packagingCount} шт)</span>
                </div>
            `;
        }
        
        itemElement.innerHTML = `
            <div class="cargo-stats-item-header">
                <div class="cargo-stats-item-title">
                    <span class="cargo-stats-item-icon">${getCargoTypeIcon(cargo.type)}</span>
                    ${cargo.typeName}
                </div>
                <div class="cargo-stats-item-count">${group.count} мест</div>
            </div>
            <div class="cargo-stats-item-details">
                <div class="cargo-stats-item-detail">
                    <span class="detail-label">Количество мест:</span>
                    <span class="detail-value">${group.count} шт</span>
                </div>
                <div class="cargo-stats-item-detail">
                    <span class="detail-label">Размеры 1 места:</span>
                    <span class="detail-value">${cargo.length}×${cargo.width}×${cargo.height} см</span>
                </div>
                <div class="cargo-stats-item-detail">
                    <span class="detail-label">Вес 1 места:</span>
                    <span class="detail-value">${(group.totalWeight / group.count).toFixed(1)} кг</span>
                </div>
                <div class="cargo-stats-item-detail">
                    <span class="detail-label">Общий вес груза:</span>
                    <span class="detail-value">${group.totalWeight.toFixed(1)} кг</span>
                </div>
                <div class="cargo-stats-item-detail">
                    <span class="detail-label">Объем 1 места:</span>
                    <span class="detail-value">${cargo.volume.toFixed(3)} м³</span>
                </div>
                ${packagingHTML}
                ${cargo.photos && cargo.photos.length > 0 ? `
                <div class="cargo-stats-item-detail">
                    <span class="detail-label">Фото:</span>
                    <span class="detail-value">${cargo.photos.length} шт</span>
                </div>
                ` : ''}
            </div>
            <div class="cargo-stats-item-total">
                <span class="total-label">Всего в группе:</span>
                <span class="total-value">Вес: ${group.totalWeight.toFixed(1)} кг, Объем: ${group.totalVolume.toFixed(3)} м³</span>
            </div>
            <button class="cargo-stats-item-remove" onclick="removeCargoGroup('${key}')">
                🗑️ Удалить группу
            </button>
        `;
        
        itemsContainer.appendChild(itemElement);
    });
    
    let typesSummaryHTML = '';
    for (const type in cargoTypesInPopup) {
        const info = cargoTypesInPopup[type];
        typesSummaryHTML += `
            <div class="cargo-stats-total-item">
                <span class="total-label">${info.name}:</span>
                <span class="total-value">${info.places} мест (${info.count} групп) - ${info.weight.toFixed(1)} кг</span>
            </div>
        `;
    }
    
    totalsContainer.innerHTML = `
        <div class="cargo-stats-total-item">
            <span class="total-label">Всего мест:</span>
            <span class="total-value">${totalPlaces}</span>
        </div>
        <div class="cargo-stats-total-item">
            <span class="total-label">Общая масса:</span>
            <span class="total-value">${totalWeight.toFixed(1)} кг</span>
        </div>
        <div class="cargo-stats-total-item">
            <span class="total-label">Общий объем:</span>
            <span class="total-value">${totalVolume.toFixed(3)} м³</span>
        </div>
        ${typesSummaryHTML}
    `;
    
    document.getElementById('cargoStatsPopup').style.display = 'block';
    document.getElementById('cargoStatsOverlay').style.display = 'block';
}

// Получение иконки для типа груза
function getCargoTypeIcon(type) {
    switch(type) {
        case 'euro-pallet': return '🇪🇺';
        case 'american-pallet': return '🇺🇸';
        case 'box': return '📦';
        case 'non-standard': return '📏';
        default: return '📦';
    }
}

// Удаление группы грузов
function removeCargoGroup(cargoKey) {
    if (confirm('Удалить всю группу одинаковых грузов?')) {
        const groupSize = groupedCargo[cargoKey] ? groupedCargo[cargoKey].count : 0;
        cargoList = cargoList.filter(cargo => cargo.cargoKey !== cargoKey);
        
        localStorage.setItem('cargoList', JSON.stringify(cargoList));
        updateCargoGrouping();
        updateTotalStatsFixed();
        showCargoStatsPopup();
        
        showNotification(`Удалено ${groupSize} мест(а) груза`, 'info');
    }
}

// Закрытие окна статистики
function closeCargoStatsPopup() {
    document.getElementById('cargoStatsPopup').style.display = 'none';
    document.getElementById('cargoStatsOverlay').style.display = 'none';
}

// Очистка всех грузов
function clearAllCargo() {
    if (cargoList.length === 0) {
        showNotification('Нет грузов для очистки', 'info');
        return;
    }
    
    if (confirm(`Удалить все ${cargoList.length} грузов? Это действие нельзя отменить.`)) {
        const totalCount = cargoList.length;
        cargoList = [];
        groupedCargo = {};
        
        localStorage.removeItem('cargoList');
        updateTotalStatsFixed();
        closeCargoStatsPopup();
        
        showNotification(`Удалено ${totalCount} грузов`, 'info');
    }
}

// Отправка данных оператору
function sendToOperatorAndReset() {
    if (cargoList.length === 0) {
        showNotification('Нет грузов для отправки', 'warning');
        return;
    }
    
    const authData = localStorage.getItem('employeeAuth');
    let employeeInfo = {};
    
    if (authData) {
        try {
            employeeInfo = JSON.parse(authData);
        } catch (e) {
            console.error('Ошибка парсинга данных сотрудника:', e);
        }
    }
    
    const shipmentData = {
        employee: employeeInfo.fullName || employeeInfo.name || 'Неизвестный сотрудник',
        employeeId: employeeInfo.id || 'unknown',
        employeeCode: employeeInfo.code || 'unknown',
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('ru-RU'),
        time: new Date().toLocaleTimeString('ru-RU'),
        totalPlaces: cargoList.reduce((sum, cargo) => sum + cargo.quantity, 0),
        totalWeight: cargoList.reduce((sum, cargo) => sum + cargo.weight, 0),
        totalVolume: cargoList.reduce((sum, cargo) => sum + cargo.volume * cargo.quantity, 0),
        cargos: cargoList,
        groupedCargos: groupedCargo
    };
    
    const shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
    shipments.push(shipmentData);
    localStorage.setItem('shipments', JSON.stringify(shipments));
    localStorage.setItem('lastShipment', JSON.stringify(shipmentData));
    
    const totalCount = cargoList.length;
    cargoList = [];
    groupedCargo = {};
    localStorage.removeItem('cargoList');
    
    updateTotalStatsFixed();
    showNotification(`Отправлено ${totalCount} грузов оператору`, 'success');
}

// Показ уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">${message}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 250px;
        max-width: 350px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-left: 15px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
        flex: 1;
        font-size: 14px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
    
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Вспомогательные функции
function getParamName(param) {
    const names = {
        'quantity': 'Количество мест',
        'length': 'Длина',
        'width': 'Ширина',
        'height': 'Высота'
    };
    return names[param] || param;
}

function updateQuantityFromInput() {
    const input = document.getElementById('quantityInput');
    if (input) {
        let value = parseInt(input.value) || 1;
        
        if (value < 1) value = 1;
        if (value > 100) value = 100;
        
        cargoParams.quantity = value;
        input.value = value;
        updateCurrentStats();
    }
}

function updateDimensionFromInput(dimension) {
    const input = document.getElementById(dimension + 'Input');
    if (input) {
        let value = parseInt(input.value) || 10;
        
        if (value < 10) value = 10;
        if (value > 1000) value = 1000;
        
        cargoParams[dimension] = value;
        input.value = value;
        updateCurrentStats();
    }
}

function initMobileButtons() {
    console.log('Инициализация мобильных кнопок...');
    
    const paramButtons = document.querySelectorAll('.param-btn');
    paramButtons.forEach(button => {
        button.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.add('active');
        });
        
        button.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('active');
        });
        
        button.addEventListener('touchcancel', function(e) {
            this.classList.remove('active');
        });
    });
}

// Функции для обработки ввода
function handleInputChange(param, value) {
    const numValue = parseInt(value) || 0;
    if (param in cargoParams) {
        cargoParams[param] = numValue;
        updateCurrentStats();
    }
}

function validateAndUpdateInput(param, inputElement) {
    let value = parseInt(inputElement.value) || 0;
    
    switch(param) {
        case 'quantity':
            if (value < 1) value = 1;
            if (value > 100) value = 100;
            break;
        case 'length':
        case 'width':
        case 'height':
            if (value < 10) value = 10;
            if (value > 1000) value = 1000;
            break;
    }
    
    inputElement.value = value;
    cargoParams[param] = value;
    updateCurrentStats();
}

// Экспорт функций
window.selectCargoType = selectCargoType;
window.selectPackagingType = selectPackagingType;
window.changeParam = changeParam;
window.editWeight = editWeight;
window.openCamera = openCamera;
window.saveCargo = saveCargo;
window.sendToOperatorAndReset = sendToOperatorAndReset;
window.showCargoStatsPopup = showCargoStatsPopup;
window.closeCargoStatsPopup = closeCargoStatsPopup;
window.removeCargoGroup = removeCargoGroup;
window.clearAllCargo = clearAllCargo;
window.logout = logout;
window.updateQuantityFromInput = updateQuantityFromInput;
window.updateDimensionFromInput = updateDimensionFromInput;

// Функции клавиатуры
window.addWeightDigit = addWeightDigit;
window.removeWeightDigit = removeWeightDigit;
window.clearWeightInput = clearWeightInput;
window.saveWeightFromKeyboard = saveWeightFromKeyboard;
window.closeWeightKeyboard = closeWeightKeyboard;

console.log('Все функции cargo.js загружены и готовы к использованию');