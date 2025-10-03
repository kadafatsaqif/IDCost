let loanChart = null;

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
document.getElementById('loanAmount').addEventListener('input', e => formatNumberInput(e.target));
document.getElementById('deposit').addEventListener('input', e => formatNumberInput(e.target));

// Setup validation for months input
document.getElementById('loanTermMonths').addEventListener('input', function(e) {
    let value = parseInt(e.target.value);
    if (value > 11) {
        e.target.value = 11;
        alert('Bulan tidak boleh lebih dari 11. Gunakan tahun untuk periode yang lebih panjang.');
    }
    if (value < 0) {
        e.target.value = 0;
    }
});

// Setup validation for years input
document.getElementById('loanTermYears').addEventListener('input', function(e) {
    let value = parseInt(e.target.value);
    if (value > 30) {
        e.target.value = 30;
        alert('Jangka waktu pinjaman maksimal 30 tahun.');
    }
    if (value < 0) {
        e.target.value = 0;
    }
});

// Calculate loan
const calculateLoan = () => {
    const loanAmountInput = document.getElementById('loanAmount');
    const depositInput = document.getElementById('deposit');
    const loanTermYearsInput = document.getElementById('loanTermYears');
    const loanTermMonthsInput = document.getElementById('loanTermMonths');
    const interestRateInput = document.getElementById('interestRate');

    if (!loanAmountInput.value.trim() || !interestRateInput.value.trim()) {
        alert('Silakan masukkan jumlah pinjaman dan suku bunga');
        return;
    }

    // Show loading
    document.getElementById('loading').classList.add('show');
    document.getElementById('results').style.display = 'none';
    document.getElementById('loanChart').style.display = 'none';

    setTimeout(() => {
        try {
            const loanAmount = getNumericValue(loanAmountInput);
            const deposit = getNumericValue(depositInput);
            const loanTermYears = parseInt(loanTermYearsInput.value) || 0;
            const loanTermMonths = parseInt(loanTermMonthsInput.value) || 0;
            const loanTerm = (loanTermYears * 12) + loanTermMonths;
            const interestRate = parseFloat(interestRateInput.value);

            // Validate months input
            if (loanTermMonths > 11) {
                alert('Bulan tidak boleh lebih dari 11. Silakan gunakan tahun untuk periode yang lebih panjang.');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            // Validate years input
            if (loanTermYears > 30) {
                alert('Jangka waktu pinjaman maksimal 30 tahun.');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            if (loanAmount <= 0) {
                alert('Silakan masukkan jumlah pinjaman yang valid');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            if (loanTerm <= 0) {
                alert('Silakan masukkan jangka waktu pinjaman yang valid (minimal 1 bulan)');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            if (loanTerm > 360) {
                alert('Jangka waktu pinjaman maksimal 30 tahun');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            if (deposit >= loanAmount) {
                alert('Uang muka harus lebih kecil dari jumlah pinjaman');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            if (interestRate <= 0 || interestRate > 50) {
                alert('Silakan masukkan suku bunga yang valid (0.1% - 50%)');
                document.getElementById('loading').classList.remove('show');
                return;
            }

            // Calculate loan details
            const principal = loanAmount - deposit;
            const monthlyInterestRate = interestRate / 100 / 12;
            
            let monthlyPayment;
            if (monthlyInterestRate === 0) {
                monthlyPayment = principal / loanTerm;
            } else {
                monthlyPayment = principal * monthlyInterestRate / 
                    (1 - Math.pow(1 + monthlyInterestRate, -loanTerm));
            }
            
            const totalPayment = monthlyPayment * loanTerm;
            const totalInterest = totalPayment - principal;

            // Calculate additional metrics
            const dpPercentage = loanAmount > 0 ? ((deposit / loanAmount) * 100).toFixed(1) : 0;
            const interestPercentage = totalPayment > 0 ? ((totalInterest / totalPayment) * 100).toFixed(1) : 0;

            // Update results
            document.getElementById('loanAmountResult').textContent = formatCurrency(loanAmount);
            document.getElementById('depositResult').textContent = `${formatCurrency(deposit)} ${deposit > 0 ? `(${dpPercentage}%)` : ''}`;
            document.getElementById('actualLoan').textContent = formatCurrency(principal);
            document.getElementById('monthlyPayment').textContent = formatCurrency(monthlyPayment);
            document.getElementById('totalPayment').textContent = formatCurrency(totalPayment);
            document.getElementById('totalInterest').textContent = `${formatCurrency(totalInterest)} (${interestPercentage}%)`;

            // Create chart
            createLoanChart(principal, totalInterest, deposit);

            // Show results
            document.getElementById('loading').classList.remove('show');
            document.getElementById('calculatorGrid').classList.add('two-columns');
            document.getElementById('resultsCard').classList.add('show');
            document.getElementById('results').style.display = 'block';
            document.getElementById('loanChart').style.display = 'block';

        } catch (error) {
            console.error('Error calculating loan:', error);
            alert('Terjadi kesalahan dalam perhitungan. Silakan coba lagi.');
            document.getElementById('loading').classList.remove('show');
            document.getElementById('calculatorGrid').classList.remove('two-columns');
            document.getElementById('resultsCard').classList.remove('show');
        }
    }, 1000);
};

// Create loan breakdown chart
const createLoanChart = (principal, totalInterest, deposit) => {
    const ctx = document.getElementById('loanChart').getContext('2d');
    if (loanChart) loanChart.destroy();

    const data = [];
    const labels = [];
    const colors = [];

    if (deposit > 0) {
        data.push(deposit);
        labels.push('Uang Muka');
        colors.push('#10b981');
    }

    data.push(principal);
    labels.push('Pokok Pinjaman');
    colors.push('#3b82f6');

    data.push(totalInterest);
    labels.push('Total Bunga');
    colors.push('#ef4444');

    loanChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverBorderWidth: 4,
                hoverOffset: 10
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
                        font: { 
                            size: 12, 
                            family: 'Inter' 
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loanTermYears').value = '1';
    document.getElementById('loanTermMonths').value = '0';
    document.getElementById('interestRate').value = '12';
});