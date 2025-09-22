// Estado global de la aplicación
let appState = {
    income: 0,
    fixedExpenses: [],
    variableExpenses: [],
    budgetPercentages: { fixed: 50, variable: 30, savings: 20 },
    emergencyFund: { current: 0, months: 6 },
    goals: [],
    debts: [],
    lastUpdated: null,
    version: '1.0'
};

// Cargar datos del localStorage al iniciar
function loadAppState() {
    try {
        const savedState = localStorage.getItem('financialOrganizerData');
        const backupState = localStorage.getItem('financialOrganizerData_backup');
        
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            // Verificar versión y migrar si es necesario
            if (parsedState.version && parsedState.version === appState.version) {
                appState = { ...appState, ...parsedState };
                console.log('✅ Datos cargados correctamente desde localStorage');
            } else {
                // Migrar datos de versión anterior
                migrateData(parsedState);
            }
        } else if (backupState) {
            // Intentar cargar desde backup si el archivo principal falla
            console.log('⚠️ Cargando desde backup...');
            const parsedBackup = JSON.parse(backupState);
            appState = { ...appState, ...parsedBackup };
        } else {
            console.log('ℹ️ No se encontraron datos guardados. Iniciando con datos en blanco.');
        }
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        // Intentar cargar backup
        tryLoadBackup();
    }
}

// Función para migrar datos de versiones anteriores
function migrateData(oldData) {
    console.log('🔄 Migrando datos a nueva versión...');
    appState = {
        ...appState,
        ...oldData,
        version: '1.0',
        lastUpdated: new Date().toISOString()
    };
    saveAppState();
}

// Intentar cargar backup en caso de error
function tryLoadBackup() {
    try {
        const backupState = localStorage.getItem('financialOrganizerData_backup');
        if (backupState) {
            appState = { ...appState, ...JSON.parse(backupState) };
            console.log('✅ Datos recuperados desde backup');
            saveAppState(); // Restaurar archivo principal
        }
    } catch (backupError) {
        console.error('❌ Error al cargar backup:', backupError);
        alert('Hubo un problema al cargar tus datos. Se iniciará con datos en blanco.');
    }
}

// Guardar datos en localStorage con backup automático
function saveAppState() {
    try {
        // Actualizar timestamp
        appState.lastUpdated = new Date().toISOString();
        
        const dataToSave = JSON.stringify(appState);
        
        // Crear backup del estado anterior antes de guardar
        const currentData = localStorage.getItem('financialOrganizerData');
        if (currentData) {
            localStorage.setItem('financialOrganizerData_backup', currentData);
        }
        
        // Guardar nuevos datos
        localStorage.setItem('financialOrganizerData', dataToSave);
        
        // Guardar copia adicional con timestamp para historial
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        localStorage.setItem(`financialOrganizerData_${timestamp}`, dataToSave);
        
        // Limpiar datos antiguos (mantener solo últimos 30 días)
        cleanOldBackups();
        
        console.log('💾 Datos guardados correctamente:', new Date().toLocaleString());
        
        // Mostrar indicador visual de guardado
        showSaveIndicator();
        
    } catch (error) {
        console.error('❌ Error al guardar datos:', error);
        if (error.name === 'QuotaExceededError') {
            alert('El almacenamiento está lleno. Se intentará limpiar datos antiguos.');
            cleanOldBackups(true);
            // Intentar guardar nuevamente
            try {
                localStorage.setItem('financialOrganizerData', JSON.stringify(appState));
            } catch (retryError) {
                alert('No se pudieron guardar los datos. El almacenamiento local está lleno.');
            }
        }
    }
}

// Limpiar backups antiguos
function cleanOldBackups(force = false) {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('financialOrganizerData_')) {
                const dateStr = key.replace('financialOrganizerData_', '');
                if (dateStr.length === 10) { // YYYY-MM-DD format
                    const backupDate = new Date(dateStr);
                    if (force || backupDate < thirtyDaysAgo) {
                        localStorage.removeItem(key);
                        console.log(`🗑️ Backup eliminado: ${key}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error limpiando backups:', error);
    }
}

// Mostrar indicador visual de guardado
function showSaveIndicator() {
    // Crear o mostrar indicador de guardado
    let indicator = document.getElementById('save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'save-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        indicator.innerHTML = '💾 Datos guardados';
        document.body.appendChild(indicator);
    }
    
    // Mostrar y ocultar
    indicator.style.opacity = '1';
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

// Exportar datos para backup manual
function exportData() {
    try {
        const dataToExport = {
            ...appState,
            exportDate: new Date().toISOString(),
            version: appState.version
        };
        
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finanzas-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('✅ Backup exportado exitosamente');
    } catch (error) {
        console.error('Error al exportar:', error);
        alert('❌ Error al exportar los datos');
    }
}

// Importar datos desde backup
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Verificar que sea un archivo válido
            if (importedData.version && importedData.income !== undefined) {
                // Confirmar importación
                if (confirm('¿Estás seguro de que quieres importar estos datos? Se sobrescribirán los datos actuales.')) {
                    appState = { ...appState, ...importedData };
                    saveAppState();
                    location.reload(); // Recargar para mostrar nuevos datos
                }
            } else {
                alert('❌ El archivo no es un backup válido');
            }
        } catch (error) {
            console.error('Error al importar:', error);
            alert('❌ Error al leer el archivo de backup');
        }
    };
    reader.readAsText(file);
}

// Auto-guardado cada 30 segundos
function initAutoSave() {
    setInterval(() => {
        if (appState.lastUpdated) {
            saveAppState();
        }
    }, 30000); // 30 segundos
}

// Verificar integridad de datos
function verifyDataIntegrity() {
    const issues = [];
    
    if (appState.income < 0) issues.push('Ingresos negativos detectados');
    if (!Array.isArray(appState.fixedExpenses)) issues.push('Gastos fijos corruptos');
    if (!Array.isArray(appState.variableExpenses)) issues.push('Gastos variables corruptos');
    if (!Array.isArray(appState.goals)) issues.push('Metas corruptas');
    if (!Array.isArray(appState.debts)) issues.push('Deudas corruptas');
    
    if (issues.length > 0) {
        console.warn('⚠️ Problemas de integridad detectados:', issues);
        return false;
    }
    
    return true;
}

// Navegación entre secciones
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover clase active de todos los links y secciones
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Agregar clase active al link clickeado
            link.classList.add('active');
            
            // Mostrar sección correspondiente
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// === SECCIÓN DIAGNÓSTICO FINANCIERO ===

// Gestión de gastos dinámicos
function initExpenseManagement() {
    // Botones para agregar gastos
    document.getElementById('add-fixed-expense').addEventListener('click', () => {
        addExpenseField('fixed-expenses');
    });
    
    document.getElementById('add-variable-expense').addEventListener('click', () => {
        addExpenseField('variable-expenses');
    });

    // Gestionar eliminación de gastos
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-expense')) {
            e.target.parentElement.remove();
        }
    });
}

function addExpenseField(containerId) {
    const container = document.getElementById(containerId);
    const expenseItem = document.createElement('div');
    expenseItem.className = 'expense-item';
    
    const categoryList = containerId === 'fixed-expenses' ? 'fixed-categories' : 'variable-categories';
    
    expenseItem.innerHTML = `
        <input type="text" class="expense-category" list="${categoryList}" placeholder="Categoría">
        <input type="number" class="expense-amount" step="0.01" placeholder="Monto ($)">
        <button type="button" class="remove-expense">×</button>
    `;
    
    container.appendChild(expenseItem);
}

// Procesamiento del formulario financiero
function initFinancialForm() {
    const form = document.getElementById('financial-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Recopilar datos del formulario
        const income = parseFloat(document.getElementById('income').value) || 0;
        const fixedExpenses = collectExpenses('fixed-expenses');
        const variableExpenses = collectExpenses('variable-expenses');
        
        // Actualizar estado
        appState.income = income;
        appState.fixedExpenses = fixedExpenses;
        appState.variableExpenses = variableExpenses;
        
        // Mostrar análisis
        displayFinancialAnalysis();
        saveAppState();
    });
}

function collectExpenses(containerId) {
    const container = document.getElementById(containerId);
    const expenseItems = container.querySelectorAll('.expense-item');
    const expenses = [];
    
    expenseItems.forEach(item => {
        const category = item.querySelector('.expense-category').value.trim();
        const amount = parseFloat(item.querySelector('.expense-amount').value) || 0;
        
        if (category && amount > 0) {
            expenses.push({ category, amount });
        }
    });
    
    return expenses;
}

// Análisis financiero y visualización
function displayFinancialAnalysis() {
    const totalFixed = appState.fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalVariable = appState.variableExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalExpenses = totalFixed + totalVariable;
    const balance = appState.income - totalExpenses;
    
    // Mostrar sección de análisis
    document.getElementById('analysis-section').style.display = 'block';
    
    // Actualizar resumen
    document.getElementById('summary-income').textContent = `$${appState.income.toFixed(2)}`;
    document.getElementById('summary-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
    
    const balanceElement = document.getElementById('summary-balance');
    balanceElement.textContent = `$${balance.toFixed(2)}`;
    balanceElement.className = balance >= 0 ? 'value positive' : 'value negative';
    
    // Calcular porcentajes
    const fixedPercent = appState.income > 0 ? (totalFixed / appState.income) * 100 : 0;
    const variablePercent = appState.income > 0 ? (totalVariable / appState.income) * 100 : 0;
    const savingsPercent = appState.income > 0 ? (balance / appState.income) * 100 : 0;
    
    // Actualizar barras de progreso de la regla 50/30/20
    updateProgressBar('fixed-progress', 'fixed-percentage', fixedPercent, 50);
    updateProgressBar('variable-progress', 'variable-percentage', variablePercent, 30);
    updateProgressBar('savings-progress', 'savings-percentage', Math.max(0, savingsPercent), 20);
    
    // Crear gráfico circular
    createExpenseChart(totalFixed, totalVariable, Math.max(0, balance));
    
    // Generar recomendaciones
    generateRecommendations(fixedPercent, variablePercent, savingsPercent, balance);
    
    // Actualizar datos para otras secciones
    updateBudgetSection();
    updateEmergencyFund();
}

function updateProgressBar(progressId, percentageId, currentPercent, targetPercent) {
    const progressBar = document.getElementById(progressId);
    const percentageText = document.getElementById(percentageId);
    
    progressBar.style.width = `${Math.min(currentPercent, 100)}%`;
    percentageText.textContent = `${currentPercent.toFixed(1)}%`;
    
    // Colorear según qué tan cerca esté del objetivo
    if (currentPercent <= targetPercent * 1.1) { // Dentro del 110% del objetivo
        progressBar.className = 'progress-fill good';
    } else if (currentPercent <= targetPercent * 1.3) { // Dentro del 130% del objetivo
        progressBar.className = 'progress-fill warning';
    } else {
        progressBar.className = 'progress-fill danger';
    }
}

function createExpenseChart(fixedExpenses, variableExpenses, savings) {
    const ctx = document.getElementById('expense-chart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (window.expenseChart) {
        window.expenseChart.destroy();
    }
    
    window.expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Gastos Fijos', 'Gastos Variables', 'Ahorro/Excedente'],
            datasets: [{
                data: [fixedExpenses, variableExpenses, savings],
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                borderColor: ['#dc2626', '#d97706', '#059669'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución de Ingresos'
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function generateRecommendations(fixedPercent, variablePercent, savingsPercent, balance) {
    const recommendations = [];
    
    if (balance < 0) {
        recommendations.push('🚨 Tienes un déficit. Necesitas reducir gastos o aumentar ingresos.');
    }
    
    if (fixedPercent > 55) {
        recommendations.push('🏠 Tus gastos fijos son muy altos (>55%). Considera renegociar contratos o buscar alternativas más económicas.');
    }
    
    if (variablePercent > 35) {
        recommendations.push('🛍️ Tus gastos variables son altos (>35%). Revisa gastos en entretenimiento y compras no esenciales.');
    }
    
    if (savingsPercent < 15) {
        recommendations.push('💰 Tu capacidad de ahorro es baja (<15%). Prioriza la creación de un fondo de emergencia.');
    }
    
    if (savingsPercent > 25) {
        recommendations.push('🎯 ¡Excelente! Tienes un buen margen de ahorro. Considera invertir el excedente.');
    }
    
    if (fixedPercent <= 50 && variablePercent <= 30 && savingsPercent >= 20) {
        recommendations.push('✅ ¡Felicitaciones! Sigues la regla 50/30/20 perfectamente.');
    }
    
    const recommendationsList = document.getElementById('recommendation-list');
    recommendationsList.innerHTML = recommendations.map(rec => `<li>${rec}</li>`).join('');
}

// === SECCIÓN PRESUPUESTO Y METAS ===

function initBudgetControls() {
    const sliders = ['fixed-slider', 'variable-slider', 'savings-slider'];
    
    sliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        slider.addEventListener('input', updateBudgetFromSliders);
    });
}

function updateBudgetFromSliders() {
    const fixed = parseInt(document.getElementById('fixed-slider').value);
    const variable = parseInt(document.getElementById('variable-slider').value);
    const savings = parseInt(document.getElementById('savings-slider').value);
    
    // Asegurar que sumen 100%
    const total = fixed + variable + savings;
    if (total !== 100) {
        // Ajustar proporcionalmente
        const factor = 100 / total;
        appState.budgetPercentages = {
            fixed: Math.round(fixed * factor),
            variable: Math.round(variable * factor),
            savings: Math.round(savings * factor)
        };
    } else {
        appState.budgetPercentages = { fixed, variable, savings };
    }
    
    updateBudgetDisplay();
    saveAppState();
}

function updateBudgetSection() {
    updateBudgetDisplay();
    updateBudgetTracking();
}

function updateBudgetDisplay() {
    const { fixed, variable, savings } = appState.budgetPercentages;
    
    // Actualizar sliders
    document.getElementById('fixed-slider').value = fixed;
    document.getElementById('variable-slider').value = variable;
    document.getElementById('savings-slider').value = savings;
    
    // Actualizar etiquetas de porcentaje
    document.getElementById('fixed-budget-percent').textContent = fixed;
    document.getElementById('variable-budget-percent').textContent = variable;
    document.getElementById('savings-budget-percent').textContent = savings;
    
    // Calcular y mostrar montos
    const fixedAmount = (appState.income * fixed / 100);
    const variableAmount = (appState.income * variable / 100);
    const savingsAmount = (appState.income * savings / 100);
    
    document.getElementById('fixed-budget-amount').textContent = `$${fixedAmount.toFixed(2)}`;
    document.getElementById('variable-budget-amount').textContent = `$${variableAmount.toFixed(2)}`;
    document.getElementById('savings-budget-amount').textContent = `$${savingsAmount.toFixed(2)}`;
}

function updateBudgetTracking() {
    const totalFixed = appState.fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalVariable = appState.variableExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const fixedBudget = appState.income * appState.budgetPercentages.fixed / 100;
    const variableBudget = appState.income * appState.budgetPercentages.variable / 100;
    
    // Actualizar barras de progreso de seguimiento
    updateTrackingBar('fixed-spent-progress', 'fixed-spent-text', totalFixed, fixedBudget);
    updateTrackingBar('variable-spent-progress', 'variable-spent-text', totalVariable, variableBudget);
}

function updateTrackingBar(progressId, textId, spent, budget) {
    const progressBar = document.getElementById(progressId);
    const textElement = document.getElementById(textId);
    
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    progressBar.style.width = `${Math.min(percentage, 100)}%`;
    
    // Colorear según el gasto
    if (percentage <= 80) {
        progressBar.className = 'progress-fill good';
    } else if (percentage <= 100) {
        progressBar.className = 'progress-fill warning';
    } else {
        progressBar.className = 'progress-fill danger';
    }
    
    textElement.textContent = `$${spent.toFixed(2)} / $${budget.toFixed(2)}`;
}

// Fondo de emergencia
function initEmergencyFund() {
    document.getElementById('emergency-months').addEventListener('change', updateEmergencyFund);
    document.getElementById('current-emergency').addEventListener('input', updateEmergencyFund);
}

function updateEmergencyFund() {
    const months = parseInt(document.getElementById('emergency-months').value);
    const current = parseFloat(document.getElementById('current-emergency').value) || 0;
    
    const totalFixed = appState.fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const goal = totalFixed * months;
    
    appState.emergencyFund = { current, months };
    
    // Actualizar display
    document.getElementById('monthly-fixed-display').textContent = totalFixed.toFixed(2);
    document.getElementById('emergency-goal').textContent = goal.toFixed(2);
    document.getElementById('emergency-current').textContent = current.toFixed(2);
    document.getElementById('emergency-target').textContent = goal.toFixed(2);
    
    const percentage = goal > 0 ? (current / goal) * 100 : 0;
    document.getElementById('emergency-progress').style.width = `${Math.min(percentage, 100)}%`;
    document.getElementById('emergency-percentage-display').textContent = `${percentage.toFixed(1)}%`;
    
    const needed = Math.max(0, goal - current);
    document.getElementById('emergency-needed').textContent = needed.toFixed(2);
    
    // Colorear barra de progreso
    const progressBar = document.getElementById('emergency-progress');
    if (percentage >= 100) {
        progressBar.className = 'progress-fill good';
        document.getElementById('emergency-advice').innerHTML = '🎉 ¡Felicitaciones! Has alcanzado tu meta de fondo de emergencia.';
    } else if (percentage >= 50) {
        progressBar.className = 'progress-fill warning';
        document.getElementById('emergency-advice').innerHTML = `Vas por buen camino. Necesitas ahorrar $<span id="emergency-needed">${needed.toFixed(2)}</span> más.`;
    } else {
        progressBar.className = 'progress-fill danger';
        document.getElementById('emergency-advice').innerHTML = `Prioriza crear tu fondo de emergencia. Necesitas $<span id="emergency-needed">${needed.toFixed(2)}</span> más.`;
    }
    
    saveAppState();
}

// Metas financieras
function initGoals() {
    document.getElementById('goal-form').addEventListener('submit', addGoal);
}

function addGoal(e) {
    e.preventDefault();
    
    const name = document.getElementById('goal-name').value.trim();
    const amount = parseFloat(document.getElementById('goal-amount').value);
    const deadline = document.getElementById('goal-deadline').value;
    const type = document.getElementById('goal-type').value;
    
    if (!name || !amount || !deadline) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    const goal = {
        id: Date.now(),
        name,
        amount,
        deadline,
        type
    };
    
    appState.goals.push(goal);
    
    // Limpiar formulario
    document.getElementById('goal-form').reset();
    
    displayGoals();
    saveAppState();
}

function displayGoals() {
    const container = document.getElementById('goals-display');
    
    if (appState.goals.length === 0) {
        container.innerHTML = '<p class="empty-state">No tienes metas financieras aún. ¡Agrega tu primera meta arriba!</p>';
        return;
    }
    
    container.innerHTML = appState.goals.map(goal => {
        const deadlineDate = new Date(goal.deadline);
        const today = new Date();
        const monthsToGoal = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24 * 30));
        const monthlySavings = monthsToGoal > 0 ? goal.amount / monthsToGoal : goal.amount;
        
        return `
            <div class="goal-item">
                <div class="goal-header">
                    <div class="goal-name">${goal.name}</div>
                    <div class="goal-type-badge ${goal.type}">${getGoalTypeLabel(goal.type)}</div>
                </div>
                <div class="goal-details">
                    <div class="goal-detail">
                        <span>Meta:</span>
                        <span>$${goal.amount.toFixed(2)}</span>
                    </div>
                    <div class="goal-detail">
                        <span>Fecha límite:</span>
                        <span>${formatDate(goal.deadline)}</span>
                    </div>
                    <div class="goal-detail">
                        <span>Meses restantes:</span>
                        <span>${Math.max(0, monthsToGoal)} meses</span>
                    </div>
                </div>
                <div class="monthly-savings">
                    Necesitas ahorrar: $${monthlySavings.toFixed(2)} mensuales
                </div>
            </div>
        `;
    }).join('');
}

function getGoalTypeLabel(type) {
    const labels = {
        short: 'Corto Plazo',
        medium: 'Mediano Plazo',
        long: 'Largo Plazo'
    };
    return labels[type] || type;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

// === SECCIÓN GESTIÓN DE DEUDAS ===

function initDebtManagement() {
    document.getElementById('debt-form').addEventListener('submit', addDebt);
    document.getElementById('snowball-btn').addEventListener('click', () => setDebtStrategy('snowball'));
    document.getElementById('avalanche-btn').addEventListener('click', () => setDebtStrategy('avalanche'));
}

function addDebt(e) {
    e.preventDefault();
    
    const name = document.getElementById('debt-name').value.trim();
    const balance = parseFloat(document.getElementById('debt-balance').value);
    const rate = parseFloat(document.getElementById('debt-rate').value);
    const minimum = parseFloat(document.getElementById('debt-minimum').value);
    
    if (!name || !balance || !rate || !minimum) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    const debt = {
        id: Date.now(),
        name,
        balance,
        rate,
        minimum
    };
    
    appState.debts.push(debt);
    
    // Limpiar formulario
    document.getElementById('debt-form').reset();
    
    // Mostrar sección de estrategias si es la primera deuda
    if (appState.debts.length === 1) {
        document.getElementById('debt-strategy').style.display = 'block';
    }
    
    displayDebts();
    saveAppState();
}

function setDebtStrategy(strategy) {
    // Actualizar botones
    document.querySelectorAll('.strategy-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${strategy}-btn`).classList.add('active');
    
    // Mostrar explicación correspondiente
    document.querySelectorAll('.strategy-info').forEach(info => info.style.display = 'none');
    document.getElementById(`${strategy}-explanation`).style.display = 'block';
    
    displayDebts(strategy);
}

function displayDebts(strategy = 'snowball') {
    const container = document.getElementById('debts-display');
    
    if (appState.debts.length === 0) {
        container.innerHTML = '<p class="empty-state">No tienes deudas registradas.</p>';
        return;
    }
    
    // Ordenar deudas según estrategia
    const sortedDebts = [...appState.debts];
    if (strategy === 'snowball') {
        sortedDebts.sort((a, b) => a.balance - b.balance);
    } else {
        sortedDebts.sort((a, b) => b.rate - a.rate);
    }
    
    container.innerHTML = sortedDebts.map((debt, index) => `
        <div class="debt-item">
            <div class="debt-priority">Prioridad #${index + 1}</div>
            <h5>${debt.name}</h5>
            <div class="debt-info">
                <div class="debt-detail">
                    <span class="label">Saldo</span>
                    <span class="value">$${debt.balance.toFixed(2)}</span>
                </div>
                <div class="debt-detail">
                    <span class="label">Tasa</span>
                    <span class="value">${debt.rate.toFixed(2)}%</span>
                </div>
                <div class="debt-detail">
                    <span class="label">Pago Mínimo</span>
                    <span class="value">$${debt.minimum.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Calculadora de intereses
function initInterestCalculator() {
    document.getElementById('calculate-interest').addEventListener('click', calculateInterest);
}

function calculateInterest() {
    const principal = parseFloat(document.getElementById('principal').value);
    const annualRate = parseFloat(document.getElementById('interest-rate').value);
    const monthlyPayment = parseFloat(document.getElementById('payment').value);
    
    if (!principal || !annualRate || !monthlyPayment) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    const monthlyRate = annualRate / 100 / 12;
    let balance = principal;
    let totalInterest = 0;
    let months = 0;
    const maxMonths = 600; // 50 años máximo
    
    const paymentData = [];
    
    while (balance > 0.01 && months < maxMonths) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
        
        if (principalPayment <= 0) {
            alert('El pago es muy bajo. No podrás pagar esta deuda con este monto.');
            return;
        }
        
        balance -= principalPayment;
        totalInterest += interestPayment;
        months++;
        
        // Guardar datos para el gráfico (solo cada 6 meses para reducir puntos)
        if (months % 6 === 0 || balance <= 0.01) {
            paymentData.push({
                month: months,
                balance: Math.max(0, balance),
                totalInterest: totalInterest
            });
        }
    }
    
    // Mostrar resultados
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    let timeText = '';
    if (years > 0) {
        timeText = `${years} año${years > 1 ? 's' : ''}`;
        if (remainingMonths > 0) {
            timeText += ` y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`;
        }
    } else {
        timeText = `${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`;
    }
    
    document.getElementById('payoff-time').textContent = timeText;
    document.getElementById('total-interest').textContent = `$${totalInterest.toFixed(2)}`;
    document.getElementById('total-paid').textContent = `$${(principal + totalInterest).toFixed(2)}`;
    
    // Crear gráfico
    createPaymentChart(paymentData);
}

function createPaymentChart(data) {
    const ctx = document.getElementById('payment-chart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (window.paymentChart) {
        window.paymentChart.destroy();
    }
    
    window.paymentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => `Mes ${d.month}`),
            datasets: [{
                label: 'Saldo Restante',
                data: data.map(d => d.balance),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Intereses Acumulados',
                data: data.map(d => d.totalInterest),
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Evolución de la Deuda'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// Inicialización de la aplicación
function initApp() {
    loadAppState();
    verifyDataIntegrity();
    initAutoSave();
    initNavigation();
    initExpenseManagement();
    initFinancialForm();
    initBudgetControls();
    initEmergencyFund();
    initGoals();
    initDebtManagement();
    initInterestCalculator();
    initDataManagement();
    
    // Cargar datos existentes si los hay
    if (appState.income > 0) {
        populateFormFromState();
        displayFinancialAnalysis();
    }
    
    if (appState.emergencyFund.current > 0) {
        document.getElementById('current-emergency').value = appState.emergencyFund.current;
        document.getElementById('emergency-months').value = appState.emergencyFund.months;
        updateEmergencyFund();
    }
    
    displayGoals();
    displayDebts();
    
    // Mostrar información de última actualización
    displayLastUpdated();
}

// Inicializar gestión de datos (exportar/importar)
function initDataManagement() {
    // Crear botones de gestión de datos si no existen
    if (!document.getElementById('data-management')) {
        createDataManagementSection();
    }
}

// Crear sección de gestión de datos
function createDataManagementSection() {
    const footer = document.querySelector('footer .container');
    const dataSection = document.createElement('div');
    dataSection.id = 'data-management';
    dataSection.style.cssText = `
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 0.5rem;
        text-align: center;
    `;
    
    dataSection.innerHTML = `
        <h4 style="color: white; margin-bottom: 1rem;">🔒 Gestión de Datos</h4>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <button id="export-btn" class="data-btn">📥 Exportar Backup</button>
            <label for="import-file" class="data-btn">📤 Importar Backup</label>
            <input type="file" id="import-file" accept=".json" style="display: none;">
            <button id="clear-data-btn" class="data-btn danger">🗑️ Limpiar Datos</button>
        </div>
        <div id="last-updated" style="margin-top: 1rem; color: rgba(255, 255, 255, 0.8); font-size: 0.9rem;"></div>
    `;
    
    footer.insertBefore(dataSection, footer.firstChild);
    
    // Agregar estilos para botones
    const style = document.createElement('style');
    style.textContent = `
        .data-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background-color 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        .data-btn:hover {
            background: #1d4ed8;
        }
        .data-btn.danger {
            background: #ef4444;
        }
        .data-btn.danger:hover {
            background: #dc2626;
        }
    `;
    document.head.appendChild(style);
    
    // Agregar event listeners
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-file').addEventListener('change', importData);
    document.getElementById('clear-data-btn').addEventListener('click', clearAllData);
}

// Limpiar todos los datos
function clearAllData() {
    if (confirm('⚠️ ¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
        if (confirm('🚨 ÚLTIMA CONFIRMACIÓN: Se borrarán todos tus datos financieros. ¿Continuar?')) {
            // Crear backup antes de limpiar
            exportData();
            
            // Limpiar localStorage
            localStorage.removeItem('financialOrganizerData');
            localStorage.removeItem('financialOrganizerData_backup');
            
            // Limpiar backups por fecha
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('financialOrganizerData_')) {
                    localStorage.removeItem(key);
                }
            }
            
            alert('✅ Datos eliminados. Se descargó un backup antes de la eliminación.');
            location.reload();
        }
    }
}

// Mostrar última actualización
function displayLastUpdated() {
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl && appState.lastUpdated) {
        const date = new Date(appState.lastUpdated);
        lastUpdatedEl.innerHTML = `
            Última actualización: ${date.toLocaleDateString('es-ES')} a las ${date.toLocaleTimeString('es-ES')}
            <br>
            <small>Tus datos se guardan automáticamente cada vez que haces cambios</small>
        `;
    }
}

function populateFormFromState() {
    // Llenar formulario con datos guardados
    document.getElementById('income').value = appState.income;
    
    // Llenar gastos fijos
    const fixedContainer = document.getElementById('fixed-expenses');
    fixedContainer.innerHTML = '';
    appState.fixedExpenses.forEach(expense => {
        addExpenseField('fixed-expenses');
        const lastItem = fixedContainer.lastElementChild;
        lastItem.querySelector('.expense-category').value = expense.category;
        lastItem.querySelector('.expense-amount').value = expense.amount;
    });
    
    // Llenar gastos variables
    const variableContainer = document.getElementById('variable-expenses');
    variableContainer.innerHTML = '';
    appState.variableExpenses.forEach(expense => {
        addExpenseField('variable-expenses');
        const lastItem = variableContainer.lastElementChild;
        lastItem.querySelector('.expense-category').value = expense.category;
        lastItem.querySelector('.expense-amount').value = expense.amount;
    });
    
    // Asegurar que haya al menos un campo de cada tipo
    if (appState.fixedExpenses.length === 0) {
        addExpenseField('fixed-expenses');
    }
    if (appState.variableExpenses.length === 0) {
        addExpenseField('variable-expenses');
    }
}

// Guardado automático en eventos de cambio
function setupAutoSaveEvents() {
    // Auto-guardar cuando se modifican campos
    document.addEventListener('input', (e) => {
        if (e.target.matches('input, select')) {
            clearTimeout(window.autoSaveTimeout);
            window.autoSaveTimeout = setTimeout(() => {
                if (appState.income > 0) {
                    saveAppState();
                }
            }, 2000); // Guardar 2 segundos después del último cambio
        }
    });
}

// Mostrar notificación de persistencia
function showDataPersistenceNotice() {
    const notice = document.getElementById('data-persistence-notice');
    const dismissed = localStorage.getItem('dataPersistenceNoticeDismissed');
    
    if (!dismissed && notice) {
        notice.style.display = 'block';
        
        // Manejar dismiss
        document.getElementById('dismiss-notice').addEventListener('click', () => {
            notice.style.display = 'none';
            localStorage.setItem('dataPersistenceNoticeDismissed', 'true');
        });
        
        // Auto-dismiss después de 5 segundos
        setTimeout(() => {
            if (notice.style.display !== 'none') {
                notice.style.display = 'none';
            }
        }, 5000);
    }
}

// Actualizar estado de datos en la interfaz
function updateDataStatus() {
    const statusText = document.getElementById('data-status-text');
    if (statusText) {
        if (appState.lastUpdated) {
            const lastUpdate = new Date(appState.lastUpdated);
            const now = new Date();
            const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
            
            let statusMessage;
            if (diffMinutes < 1) {
                statusMessage = "✅ Datos guardados hace menos de 1 minuto";
            } else if (diffMinutes < 60) {
                statusMessage = `✅ Datos guardados hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
            } else {
                const diffHours = Math.floor(diffMinutes / 60);
                statusMessage = `✅ Datos guardados hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
            }
            
            statusText.innerHTML = `${statusMessage} • Auto-guardado activado • ${getStorageInfo()}`;
        } else {
            statusText.innerHTML = "ℹ️ No hay datos guardados aún • Los datos se guardarán automáticamente";
        }
    }
}

// Obtener información del almacenamiento
function getStorageInfo() {
    try {
        const data = localStorage.getItem('financialOrganizerData');
        if (data) {
            const sizeKB = Math.round(data.length / 1024);
            return `Tamaño: ${sizeKB}KB`;
        }
        return "Sin datos";
    } catch (error) {
        return "Error al acceder al almacenamiento";
    }
}

// Verificar capacidad de almacenamiento
function checkStorageCapacity() {
    try {
        const testKey = 'storageTest';
        const testData = 'x'.repeat(1024 * 1024); // 1MB de prueba
        localStorage.setItem(testKey, testData);
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        console.warn('⚠️ Capacidad de almacenamiento limitada:', error);
        return false;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupAutoSaveEvents();
    showDataPersistenceNotice();
    checkStorageCapacity();
    
    // Actualizar estado cada 30 segundos
    setInterval(updateDataStatus, 30000);
    updateDataStatus();
    
    // Guardar datos antes de cerrar la página
    window.addEventListener('beforeunload', () => {
        if (appState.lastUpdated) {
            saveAppState();
        }
    });
    
    // Manejar visibilidad de la página para auto-guardado
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && appState.lastUpdated) {
            saveAppState();
        }
    });
    
    // Detectar cambios en localStorage desde otras pestañas
    window.addEventListener('storage', (e) => {
        if (e.key === 'financialOrganizerData' && e.newValue) {
            if (confirm('Se detectaron cambios en otra pestaña. ¿Quieres recargar para ver los cambios?')) {
                location.reload();
            }
        }
    });
});