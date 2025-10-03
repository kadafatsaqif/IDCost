let taxChart = null;

// Format currency
const formatCurrency = amount => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(amount);

// Format number input
const formatNumberInput = input => {
    let value = input.value.replace(/[^\d]/g, '');
    if (value) input.value = new Intl.NumberFormat('id-ID').format(value);
};

// Get numeric value
const getNumericValue = input => parseInt(input.value.replace(/[^\d]/g, '')) || 0;

// Setup input formatting
document.getElementById('income').addEventListener('input', e => formatNumberInput(e.target));

// Calculate progressive tax
const calculateProgressiveTax = taxableIncome => {
    let tax = 0, remaining = taxableIncome;
    const brackets = [
        { limit: 60000000, rate: 0.05 },
        { limit: 250000000, rate: 0.15 },
        { limit: 500000000, rate: 0.25 },
        { limit: 5000000000, rate: 0.30 },
        { limit: Infinity, rate: 0.35 }
    ];

    let cumulativeLimit = 0;
    for (let bracket of brackets) {
        let bracketLimit = bracket.limit - cumulativeLimit;
        let taxableInThisBracket = Math.min(remaining, bracketLimit);
        if (taxableInThisBracket > 0) {
            tax += taxableInThisBracket * bracket.rate;
            remaining -= taxableInThisBracket;
        }
        cumulativeLimit = bracket.limit;
        if (remaining <= 0) break;
    }
    return tax;
};

// Calculate tax
const calculateTax = () => {
    const incomeInput = document.getElementById('income');
    const ptkpSelect = document.getElementById('ptkp');
    const includeBpjs = document.getElementById('includeBpjs').checked;
    const includeJpk = document.getElementById('includeJpk').checked;

    if (!incomeInput.value.trim()) {
        alert('Silakan masukkan penghasilan bruto tahunan');
        incomeInput.focus();
        return;
    }

    // Show loading
    document.getElementById('loading').classList.add('show');
    document.getElementById('results').style.display = 'none';
    document.getElementById('taxChart').style.display = 'none';

    setTimeout(() => {
        try {
            const grossIncome = getNumericValue(incomeInput);
            const ptkp = parseInt(ptkpSelect.value);

            // Calculate deductions
            let bpjsDeduction = includeBpjs ? Math.min(grossIncome * 0.04, 24000000) : 0;
            let jpkDeduction = includeJpk ? Math.min(grossIncome * 0.01, 2400000) : 0;

            // Calculate taxable income
            const totalDeductions = ptkp + bpjsDeduction + jpkDeduction;
            const taxableIncome = Math.max(0, grossIncome - totalDeductions);

            // Calculate tax
            const annualTax = calculateProgressiveTax(taxableIncome);
            const monthlyTax = annualTax / 12;
            const totalTakeHome = grossIncome - annualTax - bpjsDeduction - jpkDeduction;
            const monthlyTakeHome = totalTakeHome / 12;

            // Update results
            document.getElementById('grossIncome').textContent = formatCurrency(grossIncome);
            document.getElementById('ptkpAmount').textContent = formatCurrency(ptkp);
            document.getElementById('bpjsDeduction').textContent = formatCurrency(bpjsDeduction);
            document.getElementById('jpkDeduction').textContent = formatCurrency(jpkDeduction);
            document.getElementById('taxableIncome').textContent = formatCurrency(taxableIncome);
            document.getElementById('annualTax').textContent = formatCurrency(annualTax);
            document.getElementById('monthlyTax').textContent = formatCurrency(monthlyTax);
            document.getElementById('takeHomePay').textContent = formatCurrency(totalTakeHome);
            document.getElementById('monthlyTakeHome').textContent = formatCurrency(monthlyTakeHome);

            // Create chart
            createTaxChart(grossIncome, annualTax, bpjsDeduction + jpkDeduction, totalTakeHome);

            // Show results
            document.getElementById('loading').classList.remove('show');
            document.getElementById('calculatorGrid').classList.add('two-columns');
            document.getElementById('resultsCard').classList.add('show');
            document.getElementById('results').style.display = 'block';
            document.getElementById('taxChart').style.display = 'block';

        } catch (error) {
            console.error('Error calculating tax:', error);
            alert('Terjadi kesalahan dalam perhitungan. Silakan coba lagi.');
            document.getElementById('loading').classList.remove('show');
            document.getElementById('calculatorGrid').classList.remove('two-columns');
            document.getElementById('resultsCard').classList.remove('show');
        }
    }, 1000);
};

// Create chart
const createTaxChart = (grossIncome, tax, deductions, takeHome) => {
    const ctx = document.getElementById('taxChart').getContext('2d');
    if (taxChart) taxChart.destroy();

    taxChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Take Home Pay', 'PPh 21', 'BPJS & JPK'],
            datasets: [{
                data: [takeHome, tax, deductions],
                backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { size: 12, family: 'Inter' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: context => {
                            const label = context.label;
                            const value = formatCurrency(context.parsed);
                            const percentage = ((context.parsed / grossIncome) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ptkp').value = '58500000';
});