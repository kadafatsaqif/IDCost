let expenseChart = null;

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

// Setup input formatting for all currency inputs
const currencyInputs = ['monthlyRent', 'utilities', 'internet', 'groceries', 'transportation', 'healthcare', 'education', 'entertainment', 'subscriptions'];
currencyInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', e => formatNumberInput(e.target));
});

// Calculate cost of living
const calculateCostOfLiving = () => {
    // Show loading
    document.getElementById('loading').classList.add('show');
    document.getElementById('results').style.display = 'none';
    document.getElementById('expenseChart').style.display = 'none';

    setTimeout(() => {
        try {
            // Get all values
            const expenses = {
                'Sewa/Cicilan Rumah': getNumericValue(document.getElementById('monthlyRent')),
                'Listrik & Air': getNumericValue(document.getElementById('utilities')),
                'Internet & Telepon': getNumericValue(document.getElementById('internet')),
                'Belanja & Makanan': getNumericValue(document.getElementById('groceries')),
                'Transportasi': getNumericValue(document.getElementById('transportation')),
                'Kesehatan & BPJS': getNumericValue(document.getElementById('healthcare')),
                'Pendidikan': getNumericValue(document.getElementById('education')),
                'Hiburan & Rekreasi': getNumericValue(document.getElementById('entertainment')),
                'Langganan & Lainnya': getNumericValue(document.getElementById('subscriptions'))
            };

            // Calculate totals
            const monthlyCost = Object.values(expenses).reduce((sum, value) => sum + value, 0);
            
            if (monthlyCost === 0) {
                alert('Silakan masukkan minimal satu kategori pengeluaran');
                document.getElementById('loading').classList.remove('show');
                return;
            }
            
            const annualCost = monthlyCost * 12;
            const dailyCost = monthlyCost / 30;
            const weeklyCost = monthlyCost / 4.33;

            // Find largest category
            let largestCategory = '';
            let largestAmount = 0;
            for (const [category, amount] of Object.entries(expenses)) {
                if (amount > largestAmount) {
                    largestAmount = amount;
                    largestCategory = category;
                }
            }

            // Calculate affordability insights
            const totalExpenseNonEssential = expenses['Hiburan & Rekreasi'] + expenses['Langganan & Lainnya'];
            const essentialPercentage = ((monthlyCost - totalExpenseNonEssential) / monthlyCost * 100).toFixed(1);
            const nonEssentialPercentage = (100 - essentialPercentage).toFixed(1);

            // Update results
            document.getElementById('monthlyCost').textContent = formatCurrency(monthlyCost);
            document.getElementById('annualCost').textContent = formatCurrency(annualCost);
            document.getElementById('dailyCost').textContent = formatCurrency(dailyCost);
            document.getElementById('largestCategory').textContent = `${largestCategory} (${formatCurrency(largestAmount)})`;

            // Add new result for weekly cost
            const weeklyCostElement = document.getElementById('weeklyCost');
            if (weeklyCostElement) {
                weeklyCostElement.textContent = formatCurrency(weeklyCost);
            }

            // Create chart with enhanced data
            createExpenseChart(expenses, monthlyCost);

            // Show results
            document.getElementById('loading').classList.remove('show');
            document.getElementById('calculatorGrid').classList.add('two-columns');
            document.getElementById('resultsCard').classList.add('show');
            document.getElementById('results').style.display = 'block';
            document.getElementById('expenseChart').style.display = 'block';

        } catch (error) {
            console.error('Error calculating cost of living:', error);
            alert('Terjadi kesalahan dalam perhitungan. Silakan coba lagi.');
            document.getElementById('loading').classList.remove('show');
            document.getElementById('calculatorGrid').classList.remove('two-columns');
            document.getElementById('resultsCard').classList.remove('show');
        }
    }, 1000);
};

// Create expense breakdown chart
const createExpenseChart = (expenses, totalCost) => {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    if (expenseChart) expenseChart.destroy();

    // Filter out zero values and prepare data
    const filteredExpenses = Object.entries(expenses).filter(([_, amount]) => amount > 0);
    
    if (filteredExpenses.length === 0) {
        // Show message if no expenses
        ctx.font = '16px Inter';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('Tidak ada data pengeluaran', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    const labels = filteredExpenses.map(([category, _]) => category);
    const data = filteredExpenses.map(([_, amount]) => amount);
    const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverBorderWidth: 4,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: { 
                            size: 11, 
                            family: 'Inter' 
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const meta = chart.getDatasetMeta(0);
                                    const style = meta.controller.getStyle(i);
                                    return {
                                        text: label.length > 15 ? label.substring(0, 15) + '...' : label,
                                        fillStyle: style.backgroundColor,
                                        strokeStyle: style.borderColor,
                                        lineWidth: style.borderWidth,
                                        pointStyle: 'circle',
                                        hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%',
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    });
};