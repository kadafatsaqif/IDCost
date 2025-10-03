let amortizationChart = null;

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
document.getElementById('homePrice').addEventListener('input', e => formatNumberInput(e.target));
document.getElementById('downPayment').addEventListener('input', e => formatNumberInput(e.target));
document.getElementById('monthlyIncome').addEventListener('input', e => formatNumberInput(e.target));

// Calculate mortgage
const calculateMortgage = () => {
    const homePriceInput = document.getElementById('homePrice');
    const downPaymentInput = document.getElementById('downPayment');
    const loanTermInput = document.getElementById('loanTerm');
    const interestRateInput = document.getElementById('interestRate');
    const monthlyIncomeInput = document.getElementById('monthlyIncome');

    if (!homePriceInput.value.trim() || !interestRateInput.value.trim() || !loanTermInput.value.trim()) {
        alert('Silakan masukkan harga rumah, jangka waktu kredit, dan suku bunga');
        return;
    }

    // Show loading
    document.getElementById('loading').classList.add('show');
    document.getElementById('results').style.display = 'none';
    document.getElementById('amortizationChart').style.display = 'none';

    setTimeout(() => {
        try {
            const homePrice = getNumericValue(homePriceInput);
            const downPayment = getNumericValue(downPaymentInput);
            const loanTerm = parseInt(loanTermInput.value);
            const interestRate = parseFloat(interestRateInput.value);
            const monthlyIncome = getNumericValue(monthlyIncomeInput);

            if (homePrice <= 0) {
                alert('Silakan masukkan harga rumah yang valid');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            if (downPayment >= homePrice) {
                alert('Uang muka harus lebih kecil dari harga rumah');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            if (loanTerm <= 0 || loanTerm > 50) {
                alert('Silakan masukkan jangka waktu kredit yang valid (1-50 tahun)');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            if (interestRate <= 0 || interestRate > 50) {
                alert('Silakan masukkan suku bunga yang valid (0.1% - 50%)');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            // Calculate loan details
            const principal = homePrice - downPayment;
            const numberOfPayments = loanTerm * 12;
            const monthlyInterestRate = interestRate / 100 / 12;
            
            let monthlyPayment;
            if (monthlyInterestRate === 0) {
                monthlyPayment = principal / numberOfPayments;
            } else {
                monthlyPayment = principal * monthlyInterestRate / 
                    (1 - Math.pow(1 + monthlyInterestRate, -numberOfPayments));
            }
            
            const totalPayment = monthlyPayment * numberOfPayments;
            const totalInterest = totalPayment - principal;

            // Calculate affordability check
            const dpPercentage = ((downPayment / homePrice) * 100).toFixed(1);

            // Update results
            document.getElementById('housePriceResult').textContent = formatCurrency(homePrice);
            document.getElementById('downPaymentResult').textContent = `${formatCurrency(downPayment)} (${dpPercentage}%)`;
            document.getElementById('loanAmount').textContent = formatCurrency(principal);
            document.getElementById('monthlyPayment').textContent = formatCurrency(monthlyPayment);
            document.getElementById('totalPayment').textContent = formatCurrency(totalPayment);
            document.getElementById('totalInterest').textContent = formatCurrency(totalInterest);

            // Show affordability if income is provided
            if (monthlyIncome > 0) {
                const affordabilityRatio = (monthlyPayment / monthlyIncome * 100).toFixed(1);
                const affordabilityItem = document.getElementById('affordabilityItem');
                const affordabilityElement = document.getElementById('affordabilityRatio');
                
                affordabilityItem.style.display = 'flex';
                affordabilityElement.textContent = `${affordabilityRatio}%`;
                
                // Style based on affordability
                if (affordabilityRatio <= 30) {
                    affordabilityItem.style.borderLeftColor = '#10b981';
                    affordabilityItem.style.backgroundColor = '#f0fdf4';
                } else if (affordabilityRatio <= 40) {
                    affordabilityItem.style.borderLeftColor = '#f59e0b';
                    affordabilityItem.style.backgroundColor = '#fffbeb';
                } else {
                    affordabilityItem.style.borderLeftColor = '#ef4444';
                    affordabilityItem.style.backgroundColor = '#fef2f2';
                }
            } else {
                document.getElementById('affordabilityItem').style.display = 'none';
            }

            // Calculate amortization
            const amortizationData = calculateAmortization(principal, monthlyPayment, monthlyInterestRate, numberOfPayments);
            
            // Create chart
            createAmortizationChart(amortizationData);

            // Show results
            document.getElementById('loading').classList.remove('show');
            document.getElementById('calculatorGrid').classList.add('two-columns');
            document.getElementById('resultsCard').classList.add('show');
            document.getElementById('results').style.display = 'block';
            document.getElementById('amortizationChart').style.display = 'block';

        } catch (error) {
            console.error('Error calculating mortgage:', error);
            alert('Terjadi kesalahan dalam perhitungan. Silakan coba lagi.');
            document.getElementById('loading').classList.remove('show');
            document.getElementById('calculatorGrid').classList.remove('two-columns');
            document.getElementById('resultsCard').classList.remove('show');
        }
    }, 1000);
};

// Calculate amortization schedule
const calculateAmortization = (principal, monthlyPayment, monthlyRate, numPayments) => {
    let balance = principal;
    const data = { 
        principalPayments: [], 
        interestPayments: [], 
        balances: [],
        cumulativePrincipal: [],
        cumulativeInterest: []
    };
    
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    
    // Determine how many data points to show based on loan term
    let maxMonths;
    if (numPayments <= 60) {
        // Show all months for loans 5 years or less
        maxMonths = numPayments;
    } else if (numPayments <= 120) {
        // Show every month for loans up to 10 years
        maxMonths = numPayments;
    } else if (numPayments <= 240) {
        // Show every 2 months for loans up to 20 years
        maxMonths = Math.ceil(numPayments / 2);
    } else {
        // Show every 3 months for loans longer than 20 years
        maxMonths = Math.ceil(numPayments / 3);
    }
    
    const interval = Math.ceil(numPayments / maxMonths);
    
    for (let i = 0; i < numPayments; i += interval) {
        // Calculate cumulative totals up to this point
        let tempBalance = principal;
        let tempTotalPrincipalPaid = 0;
        let tempTotalInterestPaid = 0;
        
        for (let j = 0; j <= i; j++) {
            const interestPayment = tempBalance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;
            tempBalance = Math.max(0, tempBalance - principalPayment);
            tempTotalPrincipalPaid += principalPayment;
            tempTotalInterestPaid += interestPayment;
        }
        
        // Store the current month's payment breakdown
        const currentInterestPayment = tempBalance > 0 ? tempBalance * monthlyRate : 0;
        const currentPrincipalPayment = tempBalance > 0 ? monthlyPayment - currentInterestPayment : 0;
        
        data.principalPayments.push(currentPrincipalPayment);
        data.interestPayments.push(currentInterestPayment);
        data.balances.push(tempBalance);
        data.cumulativePrincipal.push(tempTotalPrincipalPaid);
        data.cumulativeInterest.push(tempTotalInterestPaid);
    }
    
    return data;
};

// Create amortization chart
const createAmortizationChart = (data) => {
    const ctx = document.getElementById('amortizationChart').getContext('2d');
    if (amortizationChart) amortizationChart.destroy();

    // Create labels based on loan term
    const loanTerm = parseInt(document.getElementById('loanTerm').value);
    const totalMonths = loanTerm * 12;
    const dataPoints = data.principalPayments.length;
    const interval = Math.ceil(totalMonths / dataPoints);
    
    const labels = data.principalPayments.map((_, i) => {
        const monthNumber = (i + 1) * interval;
        if (totalMonths <= 60) {
            return `${monthNumber}`;
        } else if (totalMonths <= 120) {
            return monthNumber % 12 === 0 ? `Thn ${monthNumber / 12}` : `${monthNumber}`;
        } else {
            return monthNumber % 12 === 0 ? `Thn ${monthNumber / 12}` : `${monthNumber}`;
        }
    });

    amortizationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Sisa Pinjaman',
                    data: data.balances,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y',
                    pointRadius: 2,
                    pointHoverRadius: 4
                },
                {
                    label: 'Total Pokok Terbayar',
                    data: data.cumulativePrincipal,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y',
                    pointRadius: 2,
                    pointHoverRadius: 4
                },
                {
                    label: 'Total Bunga Terbayar',
                    data: data.cumulativeInterest,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y',
                    pointRadius: 2,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: totalMonths <= 60 ? 'Bulan' : 'Periode (Bulan/Tahun)',
                        font: {
                            size: 12,
                            family: 'Inter'
                        }
                    },
                    ticks: {
                        maxTicksLimit: 15,
                        font: {
                            size: 10,
                            family: 'Inter'
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Jumlah (Rupiah)',
                        font: {
                            size: 12,
                            family: 'Inter'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        },
                        font: {
                            size: 10,
                            family: 'Inter'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: { 
                            size: 11, 
                            family: 'Inter' 
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const monthNumber = (context[0].dataIndex + 1) * interval;
                            if (totalMonths <= 60) {
                                return `Bulan ${monthNumber}`;
                            } else {
                                const years = Math.floor(monthNumber / 12);
                                const months = monthNumber % 12;
                                return `${years > 0 ? `${years} Tahun ` : ''}${months > 0 ? `${months} Bulan` : ''}`.trim();
                            }
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            }
        }
    });
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loanTerm').value = '15';
    document.getElementById('interestRate').value = '6';
});