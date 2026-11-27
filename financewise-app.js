// FinanceWise Application JavaScript
// Author: Ravi Kumar Peela
// Copyright © 2026 FinanceWise

// ==========================================
// CONFIGURATION & INITIALIZATION
// ==========================================

const CONFIG = {
    apiEndpoint: 'https://api.financewise.pro', // Replace with your actual API endpoint
    googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    enableLocalStorage: true,
    sessionTimeout: 3600000, // 1 hour in milliseconds
};

// User State Management
let currentUser = null;
let userCalculations = [];

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Format percentage
function formatPercentage(value, decimals = 2) {
    return `${value.toFixed(decimals)}%`;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    toast.className = `toast active ${type}`;

    setTimeout(() => {
        toast.classList.remove('active');
    }, 4000);
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone
function validatePhone(phone) {
    const re = /^[\+]?[0-9]{10,}$/;
    return re.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// ==========================================
// FINANCIAL MATH HELPERS
// ==========================================

// Standard amortizing monthly payment. Handles 0% interest safely.
function monthlyPayment(principal, annualRatePct, years) {
    const n = years * 12;
    if (n <= 0 || principal <= 0) return 0;
    const r = annualRatePct / 100 / 12;
    if (r === 0) return principal / n;
    return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// Remaining loan balance after a number of months of on-time payments.
function remainingBalance(principal, annualRatePct, loanTermYears, monthsElapsed) {
    const n = loanTermYears * 12;
    if (principal <= 0) return 0;
    if (monthsElapsed >= n) return 0;
    const r = annualRatePct / 100 / 12;
    const pmt = monthlyPayment(principal, annualRatePct, loanTermYears);
    if (r === 0) return principal * (1 - monthsElapsed / n);
    return principal * Math.pow(1 + r, monthsElapsed) - pmt * ((Math.pow(1 + r, monthsElapsed) - 1) / r);
}

// Months and total interest to pay off a balance at a fixed payment (null if payment can't cover interest).
function payoffSchedule(balance, aprPct, payment) {
    const r = aprPct / 100 / 12;
    let bal = balance, interest = 0, months = 0;
    if (payment <= bal * r) return { months, interest, paidOff: false };
    while (bal > 0 && months < 1200) {
        const int = bal * r;
        interest += int;
        bal = bal + int - payment;
        months++;
    }
    return { months, interest, paidOff: bal <= 0 };
}

// Solve for the annualized return (CAGR) of an investment with annual contributions via bisection.
function solveAnnualizedReturn(initial, annualContribution, years, finalValue) {
    if (years <= 0 || (initial <= 0 && annualContribution <= 0)) return null;
    const fv = (r) => {
        if (Math.abs(r) < 1e-9) return initial + annualContribution * years;
        return initial * Math.pow(1 + r, years) + annualContribution * ((Math.pow(1 + r, years) - 1) / r);
    };
    let lo = -0.99, hi = 2.0;
    if (finalValue <= fv(lo)) return lo;
    if (finalValue >= fv(hi)) return hi;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (fv(mid) < finalValue) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

// ==========================================
// LOCAL STORAGE MANAGEMENT
// ==========================================

const Storage = {
    save: function(key, data) {
        if (CONFIG.enableLocalStorage) {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.error('Storage error:', error);
                return false;
            }
        }
        return false;
    },

    load: function(key) {
        if (CONFIG.enableLocalStorage) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                console.error('Storage error:', error);
                return null;
            }
        }
        return null;
    },

    remove: function(key) {
        if (CONFIG.enableLocalStorage) {
            localStorage.removeItem(key);
        }
    },

    clear: function() {
        if (CONFIG.enableLocalStorage) {
            localStorage.clear();
        }
    }
};

// ==========================================
// AUTHENTICATION SYSTEM
// ==========================================

const Auth = {
    // Check if user is logged in
    isAuthenticated: function() {
        const user = Storage.load('currentUser');
        const sessionExpiry = Storage.load('sessionExpiry');

        if (user && sessionExpiry) {
            if (Date.now() < sessionExpiry) {
                currentUser = user;
                return true;
            } else {
                this.logout();
            }
        }
        return false;
    },

    // Set authenticated user
    setUser: function(userData) {
        currentUser = userData;
        Storage.save('currentUser', userData);
        Storage.save('sessionExpiry', Date.now() + CONFIG.sessionTimeout);

        // Update UI
        this.updateAuthUI();

        // Track login
        trackEvent('Auth', 'login', userData.method);

        showToast(`Welcome back, ${userData.name}!`, 'success');
    },

    // Update authentication UI
    updateAuthUI: function() {
        const authButtons = document.querySelector('.auth-buttons');
        const userInfo = document.querySelector('.user-info');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');

        if (this.isAuthenticated()) {
            authButtons.style.display = 'none';
            userInfo.classList.add('active');

            const initials = currentUser.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase();

            userAvatar.textContent = initials;
            userName.textContent = currentUser.name.split(' ')[0];
        } else {
            authButtons.style.display = 'flex';
            userInfo.classList.remove('active');
        }
    },

    // Logout
    logout: function() {
        currentUser = null;
        Storage.remove('currentUser');
        Storage.remove('sessionExpiry');
        this.updateAuthUI();

        trackEvent('Auth', 'logout', 'manual');
        showToast('Logged out successfully', 'success');
    }
};

// Google Sign-In Handler
function handleGoogleSignIn(response) {
    // Decode JWT token
    const payload = JSON.parse(atob(response.credential.split('.')[1]));

    const userData = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        method: 'google'
    };

    Auth.setUser(userData);
    closeAuthModal();
}

// Sign in with Google (fallback if SDK doesn't load)
function signInWithGoogle() {
    // In production, this would trigger Google OAuth flow
    // For demo purposes, simulate successful login
    const userData = {
        id: 'demo_' + Date.now(),
        name: 'Demo User',
        email: 'demo@financewise.pro',
        method: 'google'
    };

    Auth.setUser(userData);
    closeAuthModal();
}

// Email Authentication
function handleEmailAuth(event) {
    event.preventDefault();

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('emailAuthBtn');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    emailError.classList.remove('active');
    passwordError.classList.remove('active');

    if (!validateEmail(email)) {
        emailError.textContent = 'Enter a valid email address.';
        emailError.classList.add('active');
        return;
    }

    if (password.length < 8) {
        passwordError.textContent = 'Password must be at least 8 characters.';
        passwordError.classList.add('active');
        return;
    }

    // Show loading
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Signing in...';

    // Simulate API call
    setTimeout(() => {
        const userData = {
            id: 'email_' + Date.now(),
            name: email.split('@')[0],
            email: email,
            method: 'email'
        };

        Auth.setUser(userData);
        closeAuthModal();

        btn.disabled = false;
        btn.textContent = 'Continue';
    }, 1500);
}

// Phone Authentication
function handlePhoneAuth(event) {
    event.preventDefault();

    const phone = document.getElementById('authPhone').value;
    const btn = document.getElementById('phoneAuthBtn');

    // Validate
    if (!validatePhone(phone)) {
        document.getElementById('phoneError').classList.add('active');
        return;
    }

    // Show loading
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Sending code...';

    // Simulate API call
    setTimeout(() => {
        showToast('Verification code sent to your phone!', 'success');

        // For demo, auto-login
        const userData = {
            id: 'phone_' + Date.now(),
            name: 'Phone User',
            phone: phone,
            method: 'phone'
        };

        Auth.setUser(userData);
        closeAuthModal();

        btn.disabled = false;
        btn.textContent = 'Send Verification Code';
    }, 1500);
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
    }
}

// ==========================================
// CALCULATOR REGISTRY
// ==========================================

const CalculatorRegistry = {

    // -----------------------------------------
    // 1. Buy vs Rent
    // -----------------------------------------
    'buy-rent': {
        icon: '🏠',
        title: 'Buy vs Rent Calculator',
        buttonLabel: 'Calculate Comparison',
        fields: [
            { id: 'homePrice', label: 'Home Price ($)', value: 400000, min: 1000, step: 1000, help: 'Purchase price of the property' },
            { id: 'downPaymentPct', label: 'Down Payment (%)', value: 20, min: 0, max: 100, step: 1, help: '20% recommended to avoid PMI' },
            { id: 'interestRate', label: 'Mortgage Rate (%)', value: 6.5, min: 0, max: 20, step: 0.1, help: 'Annual mortgage interest rate' },
            { id: 'loanTermYears', label: 'Loan Term (years)', value: 30, min: 5, max: 40, step: 1, help: 'Length of the mortgage (usually 30)' },
            { id: 'propertyTaxRate', label: 'Property Tax Rate (%)', value: 1.2, min: 0, max: 5, step: 0.1, help: 'Annual property tax as % of home value' },
            { id: 'maintenance', label: 'Monthly Maintenance ($)', value: 300, min: 0, step: 50, help: 'HOA, repairs, maintenance reserves' },
            { id: 'appreciationRate', label: 'Home Appreciation (%/yr)', value: 3, min: -10, max: 20, step: 0.5, help: 'Expected annual home value growth' },
            { id: 'monthlyRent', label: 'Monthly Rent ($)', value: 2000, min: 0, step: 50, help: 'Current comparable rental price' },
            { id: 'rentIncrease', label: 'Rent Increase (%/yr)', value: 3, min: 0, max: 20, step: 0.5, help: 'Expected annual rent growth' },
            { id: 'investmentReturn', label: 'Investment Return (%/yr)', value: 7, min: 0, max: 20, step: 0.5, help: 'Return if down payment invested instead' },
            { id: 'years', label: 'Years to Compare', value: 10, min: 1, max: 30, step: 1, help: 'Time horizon for comparison' }
        ],
        calculate: function(v) {
            const downPayment = v.homePrice * (v.downPaymentPct / 100);
            const loanAmount = Math.max(0, v.homePrice - downPayment);
            const closing = v.homePrice * 0.03;
            const monthlyMortgage = monthlyPayment(loanAmount, v.interestRate, v.loanTermYears);
            const monthlyTax = v.homePrice * (v.propertyTaxRate / 100) / 12;
            const monthlyIns = v.homePrice * 0.003 / 12;
            const monthlyOwn = monthlyMortgage + monthlyTax + monthlyIns + v.maintenance;
            const months = v.years * 12;

            // Buying over the comparison horizon (loan keeps its own term)
            const paidMonths = Math.min(months, v.loanTermYears * 12);
            const remaining = remainingBalance(loanAmount, v.interestRate, v.loanTermYears, months);
            const futureHome = v.homePrice * Math.pow(1 + v.appreciationRate / 100, v.years);
            const equity = futureHome - remaining;
            const buyingNet = equity - closing - paidMonths * monthlyOwn;
            const totalBuyingOutlay = downPayment + closing + paidMonths * monthlyOwn;

            // Renting over the same horizon
            let totalRent = 0, rent = v.monthlyRent;
            for (let y = 0; y < v.years; y++) {
                totalRent += (rent + 30) * 12;
                rent *= (1 + v.rentIncrease / 100);
            }
            const monthlyDiff = Math.max(0, monthlyOwn - v.monthlyRent);
            const rM = v.investmentReturn / 100 / 12;
            let portfolio = downPayment + closing;
            for (let i = 0; i < months; i++) {
                portfolio += monthlyDiff;
                portfolio *= (1 + rM);
            }
            const rentingNet = portfolio - totalRent;
            const diff = buyingNet - rentingNet;

            // Break-even: first full year where buying is at least as good as renting
            let breakEven = null;
            for (let y = 1; y <= v.years; y++) {
                const rem = remainingBalance(loanAmount, v.interestRate, v.loanTermYears, y * 12);
                const paid = Math.min(y * 12, v.loanTermYears * 12);
                const fv = v.homePrice * Math.pow(1 + v.appreciationRate / 100, y);
                const bNet = (fv - rem) - closing - paid * monthlyOwn;
                let tRent = 0, r = v.monthlyRent;
                for (let k = 0; k < y; k++) {
                    tRent += (r + 30) * 12;
                    r *= (1 + v.rentIncrease / 100);
                }
                let port = downPayment + closing;
                for (let i = 0; i < y * 12; i++) {
                    port += monthlyDiff;
                    port *= (1 + rM);
                }
                if (bNet >= port - tRent) { breakEven = y; break; }
            }

            const winner = diff > 0 ? 'buying' : 'renting';

            return {
                header: 'Analysis Results',
                cards: [
                    { label: 'Monthly Cost of Owning', value: formatCurrency(monthlyOwn), subtext: 'Mortgage, tax, insurance, maintenance' },
                    { label: 'Equity After ' + v.years + ' Years', value: formatCurrency(equity), cls: 'positive', subtext: 'Home value minus loan balance' },
                    { label: 'Buying Net Position', value: formatCurrency(buyingNet), cls: buyingNet >= 0 ? 'positive' : 'negative', subtext: 'Equity minus closing costs and payments' },
                    { label: 'Renting Net Position', value: formatCurrency(rentingNet), cls: rentingNet >= 0 ? 'positive' : 'negative', subtext: 'Invested savings minus rent paid' }
                ],
                recommendation: {
                    title: `💡 Recommendation: ${winner === 'buying' ? 'Buying' : 'Renting'} is Better`,
                    body: `<p>Based on your inputs, <strong>${winner}</strong> comes out ahead by
                    <strong>${formatCurrency(Math.abs(diff))}</strong> over ${v.years} years.</p>
                    <p><strong>Break-even point:</strong> ${breakEven ? breakEven + (breakEven === 1 ? ' year' : ' years') : 'Buying does not catch up within the ' + v.years + '-year horizon'}</p>
                    <p>This analysis compares a ${v.loanTermYears}-year loan against renting, including home appreciation, opportunity costs on your down payment, and all ownership expenses.
                    ${winner === 'buying' ?
                        'Buying builds equity and offers stability, but requires long-term commitment.' :
                        'Renting offers flexibility and your invested capital can potentially grow faster.'}</p>`
                }
            };
        },
        guide: `
            <h3>How to Use the Buy vs Rent Calculator</h3>
            <p>This calculator compares owning a home against renting over your chosen time horizon, including opportunity costs.</p>
            <h4>Input Guidelines:</h4>
            <ul>
                <li><strong>Home Price:</strong> Purchase price of the home you're considering</li>
                <li><strong>Down Payment:</strong> Typically 20% to avoid PMI insurance costs</li>
                <li><strong>Loan Term:</strong> Length of the mortgage — keep it at 30 years even if you might move sooner; the comparison horizon is separate</li>
                <li><strong>Interest Rate:</strong> Current mortgage rates (check bankrate.com)</li>
                <li><strong>Property Tax:</strong> Varies by location (0.5–2.5% typically)</li>
                <li><strong>Investment Return:</strong> Expected return if you invest your down payment instead (7–10% historical stock market average)</li>
            </ul>`
    },

    // -----------------------------------------
    // 2. Compound Interest
    // -----------------------------------------
    'compound-interest': {
        icon: '📈',
        title: 'Compound Interest Calculator',
        buttonLabel: 'Calculate Growth',
        fields: [
            { id: 'principal', label: 'Initial Investment ($)', value: 10000, min: 0, step: 100 },
            { id: 'monthlyContribution', label: 'Monthly Contribution ($)', value: 500, min: 0, step: 50 },
            { id: 'annualRate', label: 'Annual Interest Rate (%)', value: 7, min: 0, max: 30, step: 0.1 },
            { id: 'years', label: 'Time Period (years)', value: 30, min: 1, max: 50, step: 1 },
            { id: 'compoundFrequency', label: 'Compound Frequency', type: 'select', value: '12', options: [
                { value: '12', label: 'Monthly' },
                { value: '4', label: 'Quarterly' },
                { value: '1', label: 'Annually' },
                { value: '365', label: 'Daily' }
            ]}
        ],
        calculate: function(v) {
            const periods = v.years * v.compoundFrequency;
            const ratePerPeriod = (v.annualRate / 100) / v.compoundFrequency;
            const contributionPerPeriod = v.monthlyContribution * (12 / v.compoundFrequency);

            const fvPrincipal = v.principal * Math.pow(1 + ratePerPeriod, periods);

            let fvContributions = 0;
            for (let i = 0; i < periods; i++) {
                fvContributions += contributionPerPeriod * Math.pow(1 + ratePerPeriod, periods - i);
            }

            const finalBalance = fvPrincipal + fvContributions;
            const totalContributed = v.principal + (v.monthlyContribution * 12 * v.years);
            const totalInterest = finalBalance - totalContributed;
            const percentageGain = totalContributed > 0 ? (totalInterest / totalContributed) * 100 : 0;

            return {
                header: 'Investment Growth Projection',
                cards: [
                    { label: 'Final Balance', value: formatCurrency(finalBalance), cls: 'positive', subtext: `After ${v.years} years` },
                    { label: 'Total Contributed', value: formatCurrency(totalContributed), subtext: 'Your money invested' },
                    { label: 'Interest Earned', value: formatCurrency(totalInterest), cls: 'positive', subtext: `${formatPercentage(percentageGain)} gain` }
                ],
                recommendation: {
                    title: '💡 Power of Compound Interest',
                    body: `<p>Your investment will grow to <strong>${formatCurrency(finalBalance)}</strong> over ${v.years} years,
                    earning <strong>${formatCurrency(totalInterest)}</strong> in compound interest.</p>
                    <p>That's a <strong>${formatPercentage(percentageGain)}</strong> return on your total contributions!</p>
                    <p><strong>Key Insight:</strong> Starting early is crucial. Each year of delay can cost you tens of thousands in lost compound growth.</p>`
                }
            };
        },
        guide: `
            <h3>Understanding Compound Interest</h3>
            <p>Compound interest is the addition of interest to the principal sum, where the interest that has been added also earns interest.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>Principal:</strong> Your initial investment amount</li>
                <li><strong>Contributions:</strong> Regular additions to your investment</li>
                <li><strong>Compound Frequency:</strong> How often interest is calculated and added</li>
                <li><strong>Time:</strong> The longer your money compounds, the more it grows</li>
            </ul>`
    },

    // -----------------------------------------
    // 3. Mortgage Affordability
    // -----------------------------------------
    'mortgage-affordability': {
        icon: '🏦',
        title: 'Mortgage Affordability Calculator',
        buttonLabel: 'Calculate Affordability',
        fields: [
            { id: 'annualIncome', label: 'Gross Annual Income ($)', value: 85000, min: 0, step: 1000 },
            { id: 'monthlyDebts', label: 'Monthly Debt Payments ($)', value: 500, min: 0, step: 50, help: 'Car loans, student loans, credit card minimums' },
            { id: 'downPaymentAmount', label: 'Down Payment ($)', value: 60000, min: 0, step: 1000 },
            { id: 'interestRate', label: 'Mortgage Rate (%)', value: 6.5, min: 0, max: 20, step: 0.1 },
            { id: 'loanTermYears', label: 'Loan Term (years)', value: 30, min: 5, max: 40, step: 1 },
            { id: 'dtiRatio', label: 'Max Debt-to-Income Ratio (%)', value: 36, min: 10, max: 50, step: 1, help: 'Lenders typically allow 36–43%' },
            { id: 'propertyTaxRate', label: 'Property Tax Rate (%)', value: 1.2, min: 0, max: 5, step: 0.1 },
            { id: 'insuranceRate', label: 'Insurance Rate (%)', value: 0.35, min: 0, max: 3, step: 0.05, help: 'Annual homeowners insurance as % of home value' }
        ],
        calculate: function(v) {
            const grossMonthly = v.annualIncome / 12;
            const maxTotalDebt = grossMonthly * (v.dtiRatio / 100);
            const maxHousing = maxTotalDebt - v.monthlyDebts;

            if (grossMonthly <= 0) {
                return {
                    header: 'Affordability Results',
                    cards: [
                        { label: 'Max Affordable Home Price', value: 'Unavailable', cls: 'negative', subtext: 'Gross annual income is required' },
                        { label: 'Monthly Debt Payments', value: formatCurrency(v.monthlyDebts), subtext: 'Current monthly obligations' },
                        { label: 'Allowable Housing Budget', value: 'Unavailable', cls: 'negative', subtext: 'Enter gross annual income to calculate' }
                    ],
                    recommendation: {
                        title: '💡 Enter Your Income',
                        body: '<p>Enter gross annual income greater than $0 to calculate an affordability estimate using your debt-to-income ratio.</p>'
                    }
                };
            }

            if (maxHousing <= 0) {
                return {
                    header: 'Affordability Results',
                    cards: [
                        { label: 'Max Affordable Home Price', value: formatCurrency(0), cls: 'negative', subtext: 'Debts exceed allowable housing budget' },
                        { label: 'Monthly Debt Payments', value: formatCurrency(v.monthlyDebts), subtext: `${formatPercentage(v.monthlyDebts / grossMonthly * 100, 1)} of gross income` },
                        { label: 'Allowable Housing Budget', value: formatCurrency(0), cls: 'negative', subtext: 'Reduce debts to qualify' }
                    ],
                    recommendation: {
                        title: '💡 Recommendation: Reduce Debt First',
                        body: `<p>Your monthly debt payments of <strong>${formatCurrency(v.monthlyDebts)}</strong> already use up the
                        ${v.dtiRatio}% debt-to-income limit on your income of ${formatCurrency(v.annualIncome)} per year.</p>
                        <p>Lenders want total monthly debt (housing plus other debts) below ${v.dtiRatio}% of gross income.
                        Pay down debts or increase your down payment to improve affordability.</p>`
                    }
                };
            }

            const pmtFactor = monthlyPayment(1, v.interestRate, v.loanTermYears);
            const taxIns = (v.propertyTaxRate + v.insuranceRate) / 100 / 12;
            const maxLoan = maxHousing / (pmtFactor + taxIns);
            const maxPrice = maxLoan + v.downPaymentAmount;

            return {
                header: 'Affordability Results',
                cards: [
                    { label: 'Max Affordable Home Price', value: formatCurrency(maxPrice), cls: 'positive', subtext: `Including ${formatCurrency(v.downPaymentAmount)} down` },
                    { label: 'Max Loan Amount', value: formatCurrency(maxLoan), subtext: `${v.loanTermYears}-year loan at ${v.interestRate}%` },
                    { label: 'Max Monthly Payment (PITI)', value: formatCurrency(maxHousing), subtext: 'Principal, interest, tax, insurance' },
                    { label: 'Housing Budget Share', value: formatPercentage(maxHousing / grossMonthly * 100, 1), subtext: 'Of gross monthly income' }
                ],
                recommendation: {
                    title: '💡 What This Means',
                    body: `<p>With a gross annual income of <strong>${formatCurrency(v.annualIncome)}</strong> and
                    ${formatCurrency(v.monthlyDebts)} in monthly debts, you can afford a home up to
                    <strong>${formatCurrency(maxPrice)}</strong> at a ${v.dtiRatio}% debt-to-income ratio.</p>
                    <p>That translates to a monthly housing payment of about <strong>${formatCurrency(maxHousing)}</strong>,
                    which covers principal, interest, property tax and insurance.</p>
                    <p><strong>Tip:</strong> Staying below 28% of gross income for housing gives you extra safety margin against income interruptions.</p>`
                }
            };
        },
        guide: `
            <h3>How Much House Can You Afford?</h3>
            <p>Lenders size your loan using the debt-to-income (DTI) ratio: total monthly debt payments divided by gross monthly income.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>Front-end ratio:</strong> Housing costs alone, ideally below 28% of gross income</li>
                <li><strong>Back-end ratio (DTI):</strong> All debts including housing, typically capped at 36–43%</li>
                <li><strong>PITI:</strong> Principal, Interest, Taxes and Insurance — your true monthly cost</li>
                <li><strong>Reserves:</strong> Keep 3–6 months of expenses saved after closing</li>
            </ul>`
    },

    // -----------------------------------------
    // 4. Cash on Cash Return
    // -----------------------------------------
    'cash-on-cash': {
        icon: '💰',
        title: 'Cash on Cash Return Calculator',
        buttonLabel: 'Calculate Return',
        fields: [
            { id: 'propertyPrice', label: 'Property Price ($)', value: 300000, min: 1000, step: 1000 },
            { id: 'downPaymentPct', label: 'Down Payment (%)', value: 25, min: 0, max: 100, step: 1 },
            { id: 'closingCosts', label: 'Closing Costs ($)', value: 6000, min: 0, step: 500 },
            { id: 'rehabCosts', label: 'Rehab / Improvements ($)', value: 10000, min: 0, step: 500 },
            { id: 'annualRent', label: 'Annual Rental Income ($)', value: 24000, min: 0, step: 500 },
            { id: 'vacancyPct', label: 'Vacancy Rate (%)', value: 5, min: 0, max: 50, step: 1 },
            { id: 'annualExpenses', label: 'Annual Operating Expenses ($)', value: 7200, min: 0, step: 100, help: 'Taxes, insurance, maintenance, management' },
            { id: 'interestRate', label: 'Mortgage Rate (%)', value: 7, min: 0, max: 20, step: 0.1 },
            { id: 'loanTermYears', label: 'Loan Term (years)', value: 30, min: 5, max: 40, step: 1 }
        ],
        calculate: function(v) {
            const downPayment = v.propertyPrice * (v.downPaymentPct / 100);
            const loanAmount = Math.max(0, v.propertyPrice - downPayment);
            const monthlyDebtService = monthlyPayment(loanAmount, v.interestRate, v.loanTermYears);
            const effectiveRent = v.annualRent * (1 - v.vacancyPct / 100);
            const noi = effectiveRent - v.annualExpenses;
            const annualDebtService = monthlyDebtService * 12;
            const annualCashFlow = noi - annualDebtService;
            const totalInvested = downPayment + v.closingCosts + v.rehabCosts;
            const coc = totalInvested > 0 ? (annualCashFlow / totalInvested) * 100 : 0;
            const capRate = v.propertyPrice > 0 ? (noi / v.propertyPrice) * 100 : 0;

            return {
                header: 'Rental Property Analysis',
                cards: [
                    { label: 'Annual Cash Flow', value: formatCurrency(annualCashFlow), cls: annualCashFlow >= 0 ? 'positive' : 'negative', subtext: 'After vacancy, expenses and mortgage' },
                    { label: 'Cash on Cash Return', value: formatPercentage(coc), cls: coc >= 8 ? 'positive' : coc >= 0 ? '' : 'negative', subtext: `On ${formatCurrency(totalInvested)} invested` },
                    { label: 'Cap Rate', value: formatPercentage(capRate), subtext: 'NOI / property price (unleveraged)' },
                    { label: 'Total Cash Invested', value: formatCurrency(totalInvested), subtext: 'Down payment, closing, rehab' }
                ],
                recommendation: {
                    title: '💡 Investment Assessment',
                    body: `<p>This property generates <strong>${formatCurrency(annualCashFlow)}</strong> per year in cash flow,
                    a <strong>${formatPercentage(coc)}</strong> cash on cash return on your ${formatCurrency(totalInvested)} of invested capital.</p>
                    <p><strong>Benchmarks:</strong> Many investors target 8–12% cash on cash return and a cap rate above the local average.
                    ${coc >= 8 ? 'This deal meets the common 8%+ cash flow threshold.' : coc >= 0 ? 'This is below the 8–12% many investors target — negotiate price or rent.' : 'Negative cash flow means you subsidize this property monthly — reconsider or renegotiate.'}</p>
                    <p>Remember to also factor in appreciation, principal paydown and tax benefits, which this cash-flow figure excludes.</p>`
                }
            };
        },
        guide: `
            <h3>Evaluating Rental Property Cash Flow</h3>
            <p>Cash on cash return measures the annual pre-tax cash flow relative to the actual cash you invested.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>NOI:</strong> Net Operating Income = effective rent minus operating expenses, before debt payments</li>
                <li><strong>Cap Rate:</strong> NOI divided by price — compares properties regardless of financing</li>
                <li><strong>Cash on Cash:</strong> Annual cash flow divided by total cash invested — the return on your actual dollars</li>
                <li><strong>The 1% Rule:</strong> Monthly rent should be about 1% of purchase price as a quick screen</li>
            </ul>`
    },

    // -----------------------------------------
    // 5. Debt Payoff
    // -----------------------------------------
    'debt-payoff': {
        icon: '🎯',
        title: 'Debt Payoff Calculator',
        buttonLabel: 'Calculate Payoff Plan',
        fields: [
            { id: 'balance', label: 'Total Debt Balance ($)', value: 15000, min: 100, step: 100 },
            { id: 'apr', label: 'Annual Interest Rate (%)', value: 18.9, min: 0, max: 40, step: 0.1 },
            { id: 'monthlyPayment', label: 'Current Monthly Payment ($)', value: 400, min: 1, step: 25 },
            { id: 'extraPayment', label: 'Extra Monthly Payment ($)', value: 150, min: 0, step: 25, help: 'What you could add each month' }
        ],
        calculate: function(v) {
            const current = payoffSchedule(v.balance, v.apr, v.monthlyPayment);
            const accelerated = payoffSchedule(v.balance, v.apr, v.monthlyPayment + v.extraPayment);
            const currentPaidOff = current.paidOff;
            const acceleratedPaidOff = accelerated.paidOff;
            const monthlyInterest = v.balance * v.apr / 100 / 12;

            if (!currentPaidOff || !acceleratedPaidOff) {
                const currentStatus = currentPaidOff
                    ? `${current.months} months`
                    : v.monthlyPayment <= monthlyInterest
                        ? 'Does not reduce the balance'
                        : 'Not paid off within 100 years';
                const acceleratedPayment = v.monthlyPayment + v.extraPayment;
                const acceleratedStatus = acceleratedPaidOff
                    ? `${accelerated.months} months`
                    : acceleratedPayment <= monthlyInterest
                        ? 'Does not reduce the balance'
                        : 'Not paid off within 100 years';

                return {
                    header: 'Payoff Analysis',
                    cards: [
                        { label: 'Current Payment Plan', value: currentPaidOff ? currentStatus : 'Not Paid Off', cls: currentPaidOff ? '' : 'negative', subtext: currentPaidOff ? 'Estimated payoff time' : currentStatus },
                        { label: 'With Extra Payment', value: acceleratedPaidOff ? acceleratedStatus : 'Not Paid Off', cls: acceleratedPaidOff ? 'positive' : 'negative', subtext: acceleratedPaidOff ? 'Estimated payoff time' : acceleratedStatus },
                        { label: 'Current Plan Interest', value: currentPaidOff ? formatCurrency(current.interest) : 'Unavailable', subtext: currentPaidOff ? 'Total interest through payoff' : 'Plan does not finish' },
                        { label: 'Extra Payment Plan Interest', value: acceleratedPaidOff ? formatCurrency(accelerated.interest) : 'Unavailable', subtext: acceleratedPaidOff ? 'Total interest through payoff' : 'Plan does not finish' }
                    ],
                    recommendation: {
                        title: '💡 Payoff Plan Status',
                        body: `<p>At ${formatCurrency(v.monthlyPayment)} per month, the current plan: <strong>${currentStatus}</strong>.</p>
                        <p>With an extra ${formatCurrency(v.extraPayment)} per month, the plan: <strong>${acceleratedStatus}</strong>.</p>
                        <p>A payoff time or total interest is shown only when the plan fully pays off the balance within 100 years.</p>`
                    }
                };
            }

            const savedInterest = current.interest - (accelerated ? accelerated.interest : current.interest);
            const savedMonths = current.months - (accelerated ? accelerated.months : current.months);

            return {
                header: 'Payoff Analysis',
                cards: [
                    { label: 'Payoff Time (Current)', value: `${current.months} mo`, subtext: `≈ ${(current.months / 12).toFixed(1)} years` },
                    { label: 'Total Interest (Current)', value: formatCurrency(current.interest), cls: 'negative', subtext: `On ${formatCurrency(v.balance)} balance` },
                    { label: 'Payoff Time (With Extra)', value: accelerated ? `${accelerated.months} mo` : `${current.months} mo`, cls: 'positive', subtext: accelerated ? `≈ ${(accelerated.months / 12).toFixed(1)} years` : '' },
                    { label: 'Interest Saved', value: formatCurrency(savedInterest), cls: 'positive', subtext: `${savedMonths} months sooner` }
                ],
                recommendation: {
                    title: '💡 Payoff Strategy',
                    body: `<p>At your current payment of <strong>${formatCurrency(v.monthlyPayment)}</strong>, this debt takes
                    <strong>${current.months} months</strong> and costs <strong>${formatCurrency(current.interest)}</strong> in interest.</p>
                    <p>Adding ${formatCurrency(v.extraPayment)} per month pays it off
                    <strong>${savedMonths} months sooner</strong> and saves <strong>${formatCurrency(savedInterest)}</strong> in interest.</p>
                    <p><strong>Tip:</strong> Compare the extra-payment plan against your current payment to see how much sooner this balance could be paid off.</p>`
                }
            };
        },
        guide: `
            <h3>Getting Out of Debt Faster</h3>
            <p>This calculator models one total debt balance and compares your current monthly payment with an extra-payment plan.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>Extra Payments:</strong> Payments above monthly interest reduce your balance faster</li>
                <li><strong>Payoff Estimate:</strong> A payoff time is shown only when the balance reaches zero within the projection horizon</li>
                <li><strong>Minimum Payment Trap:</strong> Paying only minimums on high-APR debt can take decades</li>
                <li><strong>Balance Transfers:</strong> 0% APR offers can pause interest, but watch transfer fees</li>
            </ul>`
    },

    // -----------------------------------------
    // 6. Emergency Fund
    // -----------------------------------------
    'emergency-fund': {
        icon: '🚨',
        title: 'Emergency Fund Calculator',
        buttonLabel: 'Calculate Emergency Fund',
        fields: [
            { id: 'monthlyExpenses', label: 'Monthly Essential Expenses ($)', value: 3500, min: 100, step: 100, help: 'Housing, food, utilities, insurance, transport' },
            { id: 'incomeStability', label: 'Income Stability', type: 'select', value: 'stable', options: [
                { value: 'stable', label: 'Stable (salaried)' },
                { value: 'moderate', label: 'Moderate (some variability)' },
                { value: 'variable', label: 'Variable (commission/self-employed)' }
            ]},
            { id: 'dependents', label: 'Number of Dependents', value: 0, min: 0, max: 10, step: 1 },
            { id: 'dualIncome', label: 'Dual Income Household?', type: 'select', value: 'no', options: [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
            ]},
            { id: 'healthCoverage', label: 'Health Coverage', type: 'select', value: 'good', options: [
                { value: 'good', label: 'Good (low deductible)' },
                { value: 'basic', label: 'Basic (high deductible)' },
                { value: 'none', label: 'None' }
            ]},
            { id: 'currentSavings', label: 'Current Emergency Savings ($)', value: 2000, min: 0, step: 100 },
            { id: 'monthlySavings', label: 'Monthly Savings Capacity ($)', value: 500, min: 1, step: 50 }
        ],
        calculate: function(v) {
            let months = 3;
            if (v.incomeStability === 'variable') months += 3;
            else if (v.incomeStability === 'moderate') months += 1.5;
            else if (v.incomeStability === 'stable') months += 0.5;

            months += v.dependents * 0.5;
            if (v.dualIncome === 'yes') months -= 1;
            if (v.healthCoverage === 'none') months += 1.5;
            else if (v.healthCoverage === 'basic') months += 0.5;

            months = Math.max(3, Math.min(12, months));
            const recommendedAmount = v.monthlyExpenses * months;
            const gap = Math.max(0, recommendedAmount - v.currentSavings);
            const monthsToGoal = gap > 0 ? Math.ceil(gap / v.monthlySavings) : 0;
            const progress = recommendedAmount > 0 ? Math.min(100, (v.currentSavings / recommendedAmount) * 100) : 100;

            return {
                header: 'Emergency Fund Plan',
                cards: [
                    { label: 'Recommended Fund', value: formatCurrency(recommendedAmount), cls: 'positive', subtext: `${months} months of expenses` },
                    { label: 'Current Coverage', value: `${progress.toFixed(0)}%`, cls: progress >= 100 ? 'positive' : progress >= 50 ? '' : 'negative', subtext: `${formatCurrency(v.currentSavings)} saved` },
                    { label: 'Remaining Gap', value: formatCurrency(gap), cls: gap > 0 ? 'negative' : 'positive', subtext: gap > 0 ? 'Still to save' : 'Fully funded!' },
                    { label: 'Time to Goal', value: gap > 0 ? `${monthsToGoal} mo` : 'Done', subtext: `Saving ${formatCurrency(v.monthlySavings)}/month` }
                ],
                recommendation: {
                    title: '💡 Your Emergency Fund Plan',
                    body: gap > 0 ?
                        `<p>Based on your situation, you should hold <strong>${months} months</strong> of essential expenses —
                        about <strong>${formatCurrency(recommendedAmount)}</strong>.</p>
                        <p>You have ${formatCurrency(v.currentSavings)} saved, so your gap is <strong>${formatCurrency(gap)}</strong>.
                        Saving ${formatCurrency(v.monthlySavings)} per month, you'll be fully funded in about
                        <strong>${monthsToGoal} months</strong>.</p>
                        <p><strong>Where to keep it:</strong> A high-yield savings account — liquid, safe, and currently earning meaningful interest.</p>` :
                        `<p>Congratulations! Your emergency fund of <strong>${formatCurrency(v.currentSavings)}</strong> covers
                        your recommended <strong>${months} months</strong> of essential expenses.</p>
                        <p>Once fully funded, redirect your monthly savings toward investing or paying down high-interest debt.</p>`
                }
            };
        },
        guide: `
            <h3>Building Your Safety Net</h3>
            <p>An emergency fund keeps a job loss, medical bill or car repair from becoming credit card debt.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>Base Rule:</strong> 3–6 months of essential expenses for stable incomes</li>
                <li><strong>Variable Income:</strong> Self-employed or commission-based earners should target 6–12 months</li>
                <li><strong>Essential Only:</strong> Count needs, not wants — rent, food, utilities, insurance, minimum debt payments</li>
                <li><strong>Keep It Liquid:</strong> High-yield savings, not stocks or retirement accounts</li>
            </ul>`
    },

    // -----------------------------------------
    // 7. Retirement Planning
    // -----------------------------------------
    'retirement': {
        icon: '🌅',
        title: 'Retirement Planning Calculator',
        buttonLabel: 'Project Retirement',
        fields: [
            { id: 'currentAge', label: 'Current Age', value: 30, min: 16, max: 80, step: 1 },
            { id: 'retirementAge', label: 'Retirement Age', value: 65, min: 40, max: 90, step: 1 },
            { id: 'currentSavings', label: 'Current Retirement Savings ($)', value: 50000, min: 0, step: 1000 },
            { id: 'monthlyContribution', label: 'Monthly Contribution ($)', value: 800, min: 0, step: 50 },
            { id: 'annualReturn', label: 'Expected Annual Return (%)', value: 7, min: 0, max: 15, step: 0.5, help: '7% is a common inflation-adjusted stock assumption' },
            { id: 'inflationRate', label: 'Inflation Rate (%)', value: 2.5, min: 0, max: 10, step: 0.5 }
        ],
        calculate: function(v) {
            const years = v.retirementAge - v.currentAge;
            if (years <= 0) {
                return {
                    header: 'Retirement Projection',
                    cards: [
                        { label: 'Status', value: 'Already Past', cls: 'negative', subtext: 'Retirement age must exceed current age' }
                    ],
                    recommendation: {
                        title: '💡 Adjust Your Inputs',
                        body: '<p>Retirement age must be greater than your current age to project growth.</p>'
                    }
                };
            }
            const months = years * 12;
            const rM = v.annualReturn / 100 / 12;
            let balance = v.currentSavings;
            for (let i = 0; i < months; i++) {
                balance += v.monthlyContribution;
                balance *= (1 + rM);
            }
            const realValue = balance / Math.pow(1 + v.inflationRate / 100, years);
            const annualIncome4 = balance * 0.04;
            const realMonthlyIncome = (realValue * 0.04) / 12;
            const totalContributed = v.currentSavings + v.monthlyContribution * months;
            const growth = balance - totalContributed;

            return {
                header: `Projection to Age ${v.retirementAge}`,
                cards: [
                    { label: 'Projected Nest Egg', value: formatCurrency(balance), cls: 'positive', subtext: `In ${years} years (nominal)` },
                    { label: "In Today's Dollars", value: formatCurrency(realValue), subtext: `Adjusted for ${v.inflationRate}% inflation` },
                    { label: 'Annual Income (4% Rule)', value: formatCurrency(annualIncome4), subtext: 'Safe withdrawal estimate' },
                    { label: 'Monthly Income (Real)', value: formatCurrency(realMonthlyIncome), cls: 'positive', subtext: "Today's dollars, sustainable" }
                ],
                recommendation: {
                    title: '💡 Retirement Readiness',
                    body: `<p>Contributing <strong>${formatCurrency(v.monthlyContribution)}/month</strong> for ${years} years,
                    you're projected to reach <strong>${formatCurrency(balance)}</strong> — that's
                    <strong>${formatCurrency(growth)}</strong> of investment growth on top of ${formatCurrency(totalContributed)} contributed.</p>
                    <p>Using the 4% rule, that supports roughly <strong>${formatCurrency(realMonthlyIncome)}/month</strong> of sustainable
                    income in today's dollars.</p>
                    <p><strong>Reality check:</strong> Aim to replace 70–80% of your pre-retirement income. If the projection falls short, increase contributions — even ${formatCurrency(Math.max(100, v.monthlyContribution * 0.25))}/month more compounds significantly over ${years} years.</p>`
                }
            };
        },
        guide: `
            <h3>Planning for Financial Independence</h3>
            <p>This projection grows your savings at a steady return and translates the result into today's purchasing power.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>The 4% Rule:</strong> Withdrawing 4% of your nest egg annually historically sustains a 30+ year retirement</li>
                <li><strong>Nominal vs Real:</strong> Nominal dollars are future dollars; real dollars are adjusted for inflation</li>
                <li><strong>Compounding Window:</strong> Money invested in your 20s–30s does the heaviest lifting</li>
                <li><strong>Account Types:</strong> Maximize tax-advantaged accounts (401k match, IRA, HSA) before taxable investing</li>
            </ul>`
    },

    // -----------------------------------------
    // 8. Net Worth
    // -----------------------------------------
    'net-worth': {
        icon: '⚖️',
        title: 'Net Worth Calculator',
        buttonLabel: 'Calculate Net Worth',
        fields: [
            { id: 'cash', label: 'Cash & Savings ($)', value: 15000, min: 0, step: 500 },
            { id: 'investments', label: 'Investments & Retirement ($)', value: 60000, min: 0, step: 500 },
            { id: 'realEstate', label: 'Real Estate Value ($)', value: 350000, min: 0, step: 5000 },
            { id: 'vehicles', label: 'Vehicles & Valuables ($)', value: 25000, min: 0, step: 500 },
            { id: 'otherAssets', label: 'Other Assets ($)', value: 10000, min: 0, step: 500 },
            { id: 'mortgage', label: 'Mortgage Balance ($)', value: 250000, min: 0, step: 1000 },
            { id: 'studentLoans', label: 'Student Loans ($)', value: 20000, min: 0, step: 500 },
            { id: 'autoLoans', label: 'Auto Loans ($)', value: 15000, min: 0, step: 500 },
            { id: 'creditCards', label: 'Credit Card Debt ($)', value: 5000, min: 0, step: 100 },
            { id: 'otherDebts', label: 'Other Debts ($)', value: 3000, min: 0, step: 500 }
        ],
        calculate: function(v) {
            const assets = v.cash + v.investments + v.realEstate + v.vehicles + v.otherAssets;
            const liabilities = v.mortgage + v.studentLoans + v.autoLoans + v.creditCards + v.otherDebts;
            const netWorth = assets - liabilities;
            const debtToAsset = assets > 0 ? (liabilities / assets) * 100 : (liabilities > 0 ? 100 : 0);

            return {
                header: 'Net Worth Statement',
                cards: [
                    { label: 'Total Assets', value: formatCurrency(assets), cls: 'positive', subtext: 'Everything you own' },
                    { label: 'Total Liabilities', value: formatCurrency(liabilities), cls: 'negative', subtext: 'Everything you owe' },
                    { label: 'Net Worth', value: formatCurrency(netWorth), cls: netWorth >= 0 ? 'positive' : 'negative', subtext: 'Assets minus liabilities' },
                    { label: 'Debt-to-Asset Ratio', value: formatPercentage(debtToAsset, 1), subtext: debtToAsset < 50 ? 'Healthy range' : 'Consider paying down debt' }
                ],
                recommendation: {
                    title: '💡 Your Balance Sheet',
                    body: `<p>Your net worth is <strong>${formatCurrency(netWorth)}</strong>:
                    ${formatCurrency(assets)} in assets against ${formatCurrency(liabilities)} in liabilities.</p>
                    <p><strong>How you're doing:</strong> A common benchmark is net worth equal to your age × annual income ÷ 10.
                    ${netWorth > 0 ? 'You have positive net worth — keep growing assets faster than debt.' : 'Negative net worth is common early in a career with a mortgage — focus on high-interest debt first.'}</p>
                    <p><strong>Track it:</strong> Update this quarterly. Net worth is the single best measure of overall financial progress.</p>`
                }
            };
        },
        guide: `
            <h3>Measuring True Financial Position</h3>
            <p>Net worth is the definitive scoreboard: everything you own minus everything you owe.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>Assets:</strong> Cash, investments, home value, vehicles — use realistic market values</li>
                <li><strong>Liabilities:</strong> Mortgages, loans, credit cards — use current payoffs, not original amounts</li>
                <li><strong>Direction Matters:</strong> Track the trend quarterly, not the snapshot</li>
                <li><strong>Age Benchmark:</strong> Net worth ≈ (Age × Annual Income) ÷ 10</li>
            </ul>`
    },

    // -----------------------------------------
    // 9. Refinance
    // -----------------------------------------
    'refinance': {
        icon: '🔄',
        title: 'Refinance Calculator',
        buttonLabel: 'Analyze Refinance',
        fields: [
            { id: 'currentBalance', label: 'Current Loan Balance ($)', value: 320000, min: 1000, step: 1000 },
            { id: 'currentRate', label: 'Current Interest Rate (%)', value: 7.25, min: 0, max: 20, step: 0.01 },
            { id: 'currentRemainingTerm', label: 'Years Remaining (current)', value: 27, min: 1, max: 40, step: 1 },
            { id: 'newRate', label: 'New Interest Rate (%)', value: 6.0, min: 0, max: 20, step: 0.01 },
            { id: 'newTerm', label: 'New Loan Term (years)', value: 30, min: 5, max: 40, step: 1 },
            { id: 'closingCosts', label: 'Refinance Closing Costs ($)', value: 4800, min: 0, step: 100 }
        ],
        calculate: function(v) {
            const currentPmt = monthlyPayment(v.currentBalance, v.currentRate, v.currentRemainingTerm);
            const newPmt = monthlyPayment(v.currentBalance, v.newRate, v.newTerm);
            const monthlySavings = currentPmt - newPmt;
            const breakEvenMonths = monthlySavings > 0 ? v.closingCosts / monthlySavings : null;
            const currentLifetimeInterest = currentPmt * v.currentRemainingTerm * 12 - v.currentBalance;
            const newLifetimeInterest = newPmt * v.newTerm * 12 - v.currentBalance;
            const lifetimeDiff = currentLifetimeInterest - newLifetimeInterest;

            return {
                header: 'Refinance Analysis',
                cards: [
                    { label: 'Current Payment', value: formatCurrency(currentPmt), subtext: `${v.currentRemainingTerm} yrs at ${v.currentRate}%` },
                    { label: 'New Payment', value: formatCurrency(newPmt), cls: monthlySavings >= 0 ? 'positive' : 'negative', subtext: `${v.newTerm} yrs at ${v.newRate}%` },
                    { label: 'Monthly Savings', value: formatCurrency(monthlySavings), cls: monthlySavings >= 0 ? 'positive' : 'negative', subtext: breakEvenMonths ? `Break-even in ${Math.ceil(breakEvenMonths)} months` : 'No monthly savings' },
                    { label: 'Lifetime Interest Change', value: formatCurrency(lifetimeDiff), cls: lifetimeDiff >= 0 ? 'positive' : 'negative', subtext: lifetimeDiff >= 0 ? 'Saved over new loan life' : 'Extra cost over new term' }
                ],
                recommendation: {
                    title: '💡 Refinance Decision',
                    body: monthlySavings > 0 ?
                        `<p>Refinancing ${formatCurrency(v.currentBalance)} from ${v.currentRate}% to <strong>${v.newRate}%</strong> saves
                        <strong>${formatCurrency(monthlySavings)}/month</strong>.</p>
                        <p>With ${formatCurrency(v.closingCosts)} in closing costs, you break even in about
                        <strong>${Math.ceil(breakEvenMonths)} months</strong>.
                        ${breakEvenMonths <= 24 ? 'That is well within the typical 2-year break-even rule — generally a good deal.' : 'That break-even is long — make sure you will stay in the home past it.'}</p>
                        <p><strong>Watch the term:</strong> Resetting to ${v.newTerm} years lowers the payment but
                        ${lifetimeDiff < 0 ? `adds ${formatCurrency(Math.abs(lifetimeDiff))} in lifetime interest. Consider a shorter term.` : `still saves ${formatCurrency(lifetimeDiff)} in total interest.`}</p>` :
                        `<p>At ${v.newRate}%, your payment would be <strong>${formatCurrency(Math.abs(monthlySavings))} higher</strong> per month
                        than your current ${formatCurrency(currentPmt)}.</p>
                        <p>A refinance only makes sense here for other reasons (cash-out, removing PMI, switching from ARM to fixed) — not for payment relief.</p>`
                }
            };
        },
        guide: `
            <h3>When Refinancing Makes Sense</h3>
            <p>Refinancing replaces your loan with a new one. The math comes down to savings vs closing costs and time.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>Break-Even Rule:</strong> Closing costs ÷ monthly savings = months to recoup; staying past break-even means you win</li>
                <li><strong>Rate Spread:</strong> A drop of 0.75–1% often justifies refinancing</li>
                <li><strong>Term Reset:</strong> Restarting a 30-year term lowers payments but can raise lifetime interest</li>
                <li><strong>Cash-Out:</strong> Borrowing equity converts home value to cash at mortgage rates — use carefully</li>
            </ul>`
    },

    // -----------------------------------------
    // 10. Investment Return (ROI)
    // -----------------------------------------
    'investment-return': {
        icon: '📊',
        title: 'Investment Return Calculator',
        buttonLabel: 'Calculate Returns',
        fields: [
            { id: 'initialInvestment', label: 'Initial Investment ($)', value: 10000, min: 0, step: 100 },
            { id: 'annualContribution', label: 'Annual Additions ($)', value: 0, min: 0, step: 100, help: 'Additional money invested each year' },
            { id: 'finalValue', label: 'Current / Final Value ($)', value: 18500, min: 0, step: 100 },
            { id: 'years', label: 'Holding Period (years)', value: 5, min: 0.5, max: 60, step: 0.5 }
        ],
        calculate: function(v) {
            const totalInvested = v.initialInvestment + v.annualContribution * v.years;
            const totalGain = v.finalValue - totalInvested;
            const simpleROI = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
            const annualized = solveAnnualizedReturn(v.initialInvestment, v.annualContribution, v.years, v.finalValue);
            const annualizedPct = annualized !== null ? annualized * 100 : 0;

            return {
                header: 'Investment Performance',
                cards: [
                    { label: 'Total Gain', value: formatCurrency(totalGain), cls: totalGain >= 0 ? 'positive' : 'negative', subtext: `On ${formatCurrency(totalInvested)} invested` },
                    { label: 'Simple ROI', value: formatPercentage(simpleROI), cls: simpleROI >= 0 ? 'positive' : 'negative', subtext: `Total over ${v.years} years` },
                    { label: 'Annualized Return (CAGR)', value: formatPercentage(annualizedPct), cls: annualizedPct >= 7 ? 'positive' : annualizedPct >= 0 ? '' : 'negative', subtext: 'Per-year equivalent return' },
                    { label: 'Total Invested', value: formatCurrency(totalInvested), subtext: 'Principal plus additions' }
                ],
                recommendation: {
                    title: '💡 Performance Assessment',
                    body: `<p>Your investment returned <strong>${formatPercentage(simpleROI)}</strong> total,
                    which is <strong>${formatPercentage(annualizedPct)}</strong> annualized over ${v.years} years.</p>
                    <p><strong>Benchmarks:</strong> The S&P 500 has averaged roughly 10% nominal (about 7% after inflation) over long periods.
                    ${annualizedPct >= 7 ? 'Your annualized return is at or above a long-run market benchmark.' : annualizedPct >= 0 ? 'Your return trails a simple index fund benchmark — check fees and diversification.' : 'This investment lost value — evaluate whether the thesis still holds.'}</p>
                    <p><strong>Note:</strong> Annualized return accounts for the timing of your additions, unlike simple ROI.</p>`
                }
            };
        },
        guide: `
            <h3>Measuring Investment Performance</h3>
            <p>ROI tells you how much you made; annualized return tells you how fast, so different investments can be compared fairly.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>Simple ROI:</strong> Total gain ÷ total invested — ignores timing</li>
                <li><strong>CAGR:</strong> Compound annual growth rate — the steady per-year rate that produces your result</li>
                <li><strong>Compare to Benchmarks:</strong> An index fund return is the hurdle any active choice should beat</li>
                <li><strong>Fees Matter:</strong> A 1% annual fee can consume ~20% of a 30-year outcome</li>
            </ul>`
    },

    // -----------------------------------------
    // 11. Credit Card Rewards
    // -----------------------------------------
    'credit-card-rewards': {
        icon: '💳',
        title: 'Credit Card Rewards Calculator',
        buttonLabel: 'Calculate Rewards Value',
        fields: [
            { id: 'annualSpend', label: 'Annual Card Spending ($)', value: 24000, min: 100, step: 100 },
            { id: 'diningShare', label: 'Dining Share of Spend (%)', value: 20, min: 0, max: 100, step: 1 },
            { id: 'diningRate', label: 'Dining Reward Rate (%)', value: 3, min: 0, max: 10, step: 0.5 },
            { id: 'groceriesShare', label: 'Groceries Share of Spend (%)', value: 25, min: 0, max: 100, step: 1 },
            { id: 'groceriesRate', label: 'Groceries Reward Rate (%)', value: 3, min: 0, max: 10, step: 0.5 },
            { id: 'gasShare', label: 'Gas Share of Spend (%)', value: 15, min: 0, max: 100, step: 1 },
            { id: 'gasRate', label: 'Gas Reward Rate (%)', value: 2, min: 0, max: 10, step: 0.5 },
            { id: 'baseRate', label: 'Base Reward Rate (%)', value: 1, min: 0, max: 5, step: 0.5, help: 'Everything else' },
            { id: 'redemptionRate', label: 'Redemption Value (%)', value: 100, min: 20, max: 200, step: 5, help: '100% = full value (cash back); travel transfers often exceed 100%' },
            { id: 'annualFee', label: 'Annual Fee ($)', value: 95, min: 0, step: 5 }
        ],
        calculate: function(v) {
            const shareSum = v.diningShare + v.groceriesShare + v.gasShare;
            const bonusShare = Math.min(shareSum, 100);
            const baseSpend = v.annualSpend * Math.max(0, 100 - bonusShare) / 100;

            const rewards = v.annualSpend * (v.diningShare / 100) * (v.diningRate / 100) +
                v.annualSpend * (v.groceriesShare / 100) * (v.groceriesRate / 100) +
                v.annualSpend * (v.gasShare / 100) * (v.gasRate / 100) +
                baseSpend * (v.baseRate / 100);

            const rewardsValue = rewards * (v.redemptionRate / 100);
            const netBenefit = rewardsValue - v.annualFee;
            const effectiveRate = v.annualSpend > 0 ? (netBenefit / v.annualSpend) * 100 : 0;

            return {
                header: 'Rewards Analysis',
                cards: [
                    { label: 'Annual Rewards Earned', value: formatCurrency(rewards), subtext: 'At face value' },
                    { label: 'Value After Redemption', value: formatCurrency(rewardsValue), cls: 'positive', subtext: `At ${v.redemptionRate}% of face value` },
                    { label: 'Net Annual Benefit', value: formatCurrency(netBenefit), cls: netBenefit >= 0 ? 'positive' : 'negative', subtext: `After ${formatCurrency(v.annualFee)} fee` },
                    { label: 'Effective Reward Rate', value: formatPercentage(effectiveRate), cls: effectiveRate >= 2 ? 'positive' : effectiveRate >= 0 ? '' : 'negative', subtext: 'Net benefit / total spend' }
                ],
                recommendation: {
                    title: '💡 Rewards Strategy',
                    body: netBenefit > 0 ?
                        `<p>This card nets you <strong>${formatCurrency(netBenefit)}</strong> per year after the annual fee —
                        an effective return of <strong>${formatPercentage(effectiveRate)}</strong> on your spending.</p>
                        <p>${effectiveRate >= 2 ? 'That is a strong effective rate — most no-fee cards top out around 1.5–2%.' : 'A flat 2% no-annual-fee cash back card may match or beat this with less complexity.'}</p>
                        <p><strong>Golden rule:</strong> Rewards only pay if you pay the statement balance in full — at 20%+ APR, interest wipes out any reward rate.</p>` :
                        `<p>After the ${formatCurrency(v.annualFee)} annual fee, this card <strong>loses ${formatCurrency(Math.abs(netBenefit))}</strong> per year
                        at your current spending and redemption habits.</p>
                        <p>Unless you consistently capture premium redemptions (like transferable travel points above face value), a no-annual-fee 2% cash back card is the safer choice.</p>`
                }
            };
        },
        guide: `
            <h3>Making Rewards Actually Rewarding</h3>
            <p>Rewards are only valuable if redemption value exceeds fees — and if you never carry a balance.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>Effective Rate:</strong> Net annual benefit ÷ total spend — the number that matters</li>
                <li><strong>Category Bonuses:</strong> Rotating or fixed 3–5% categories can double a flat-rate card</li>
                <li><strong>Redemption Value:</strong> Cash back = 100%; statement credits and gift cards are often less; travel transfers can exceed 100%</li>
                <li><strong>Annual Fees:</strong> Only worth it if you capture the credits and perks</li>
            </ul>`
    },

    // -----------------------------------------
    // 12. Payment Method Comparison
    // -----------------------------------------
    'payment-method': {
        icon: '💵',
        title: 'Payment Method Comparison',
        buttonLabel: 'Compare Payment Methods',
        fields: [
            { id: 'monthlySpend', label: 'Monthly Spending ($)', value: 2500, min: 100, step: 50 },
            { id: 'creditCardCashback', label: 'Credit Card Cashback (%)', value: 2, min: 0, max: 10, step: 0.5 },
            { id: 'debitCardCashback', label: 'Debit Card Rewards (%)', value: 0.5, min: 0, max: 5, step: 0.1 },
            { id: 'cashDiscountPct', label: 'Cash Discount (%)', value: 0, min: 0, max: 10, step: 0.5, help: 'Some merchants discount for cash' },
            { id: 'creditCardApr', label: 'Credit Card APR (%)', value: 20, min: 0, max: 40, step: 0.5 },
            { id: 'carriedBalancePct', label: 'Balance Carried (% of spend)', value: 0, min: 0, max: 100, step: 5, help: 'Share of spending you carry month to month' }
        ],
        calculate: function(v) {
            const annualSpend = v.monthlySpend * 12;
            const creditRewards = annualSpend * (v.creditCardCashback / 100);
            const debitRewards = annualSpend * (v.debitCardCashback / 100);
            const cashBenefit = annualSpend * (v.cashDiscountPct / 100);
            const carriedBalance = annualSpend * (v.carriedBalancePct / 100);
            const annualInterest = carriedBalance * (v.creditCardApr / 100);
            const creditNet = creditRewards - annualInterest;

            let winner, winnerLabel, winnerValue;
            if (creditNet >= debitRewards && creditNet >= cashBenefit) {
                winner = 'credit'; winnerLabel = 'Credit Card'; winnerValue = creditNet;
            } else if (debitRewards >= cashBenefit) {
                winner = 'debit'; winnerLabel = 'Debit Card'; winnerValue = debitRewards;
            } else {
                winner = 'cash'; winnerLabel = 'Cash'; winnerValue = cashBenefit;
            }

            return {
                header: 'Payment Method Comparison',
                cards: [
                    { label: 'Credit Card Net Benefit', value: formatCurrency(creditNet), cls: creditNet >= 0 ? 'positive' : 'negative', subtext: `${formatCurrency(creditRewards)} rewards${annualInterest > 0 ? ` minus ${formatCurrency(annualInterest)} interest` : ''}` },
                    { label: 'Debit Card Benefit', value: formatCurrency(debitRewards), subtext: `${v.debitCardCashback}% on ${formatCurrency(annualSpend)}` },
                    { label: 'Cash Benefit', value: formatCurrency(cashBenefit), subtext: cashDiscountPctLabel(v.cashDiscountPct) },
                    { label: 'Best Method', value: winnerLabel, cls: 'positive', subtext: `${formatCurrency(winnerValue)} annual benefit` }
                ],
                recommendation: {
                    title: `💡 Recommendation: Use ${winnerLabel}`,
                    body: annualInterest > 0 ?
                        `<p>Carrying <strong>${formatCurrency(carriedBalance)}</strong> of balances at ${v.creditCardApr}% APR costs you
                        <strong>${formatCurrency(annualInterest)}</strong> per year in interest — more than
                        ${formatCurrency(creditRewards)} in rewards, making credit a <strong>net loss of ${formatCurrency(Math.abs(creditNet))}</strong>.</p>
                        <p>Until you pay balances in full, debit or cash protects you from interest costs that rewards can never offset.</p>` :
                        `<p>On ${formatCurrency(annualSpend)} of annual spending, <strong>${winnerLabel}</strong> comes out ahead with
                        <strong>${formatCurrency(winnerValue)}</strong> in annual benefit.</p>
                        <p><strong>Best practice:</strong> Put everyday spending on a rewards credit card, pay the statement balance in full every month, and keep debit/cash for merchants that discount for cash.</p>`
                }
            };
        },
        guide: `
            <h3>Choosing How to Pay</h3>
            <p>Each payment method has a different return — and credit only wins if you avoid interest entirely.</p>
            <h4>Key Concepts:</h4>
            <ul>
                <li><strong>Credit:</strong> 1–5% rewards plus fraud protection, but 20%+ APR if you carry a balance</li>
                <li><strong>Debit:</strong> Modest rewards, spending comes straight from your account</li>
                <li><strong>Cash:</strong> Sometimes earns a discount; zero rewards otherwise</li>
                <li><strong>The Crossover:</strong> Carrying even 10% of spend as a balance usually erases all rewards</li>
            </ul>`
    }
};

function cashDiscountPctLabel(pct) {
    return pct > 0 ? `${pct}% merchant cash discount` : 'No cash discount configured';
}

// ==========================================
// CALCULATOR UI MANAGEMENT
// ==========================================

let currentCalculator = null;

function buildFormHTML(def, calculatorId) {
    const fieldsHTML = def.fields.map(f => {
        const help = f.help ? `<span class="form-help">${f.help}</span>` : '';
        if (f.type === 'select') {
            const opts = f.options.map(o =>
                `<option value="${o.value}" ${String(o.value) === String(f.value) ? 'selected' : ''}>${o.label}</option>`
            ).join('');
            return `<div class="form-group">
                <label class="form-label">${f.label}</label>
                <select class="form-select" id="${calculatorId}__${f.id}">${opts}</select>
                ${help}
            </div>`;
        }
        const minAttr = f.min !== undefined ? `min="${f.min}"` : '';
        const maxAttr = f.max !== undefined ? `max="${f.max}"` : '';
        const stepAttr = f.step !== undefined ? `step="${f.step}"` : '';
        return `<div class="form-group">
            <label class="form-label">${f.label}</label>
            <input type="number" class="form-input" id="${calculatorId}__${f.id}" value="${f.value}" ${minAttr} ${maxAttr} ${stepAttr}>
            ${help}
        </div>`;
    }).join('');

    return `
        <div class="form-grid">${fieldsHTML}</div>
        <button class="btn btn-primary btn-large" onclick="runCalculator('${calculatorId}')" style="width: 100%; justify-content: center; margin-top: 1rem;">
            ${def.buttonLabel || 'Calculate'}
        </button>
        <div id="resultsSection" class="results-section"></div>
    `;
}

function openCalculator(calculatorId) {
    const def = CalculatorRegistry[calculatorId];
    if (!def) return;

    currentCalculator = calculatorId;
    const modal = document.getElementById('calculatorModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const calculatorContent = document.getElementById('calculatorContent');
    const guideContent = document.getElementById('guideContent');

    modalIcon.textContent = def.icon;
    modalTitle.textContent = def.title;
    calculatorContent.innerHTML = buildFormHTML(def, calculatorId);
    guideContent.innerHTML = def.guide;

    // Clear any results from a previously opened calculator
    document.getElementById('resultsContent').innerHTML = '';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset to the calculator tab
    switchTab(null, 'calculator');

    // Initialize form listeners
    initializeCalculatorForm();
}

function closeCalculatorModal() {
    document.getElementById('calculatorModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentCalculator = null;
}

function switchTab(event, tabName) {
    // Update tab buttons — event may be null when switching programmatically
    document.querySelectorAll('#calculatorModal .modal-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('#calculatorModal .tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');

    // Track tab view
    trackEvent('Calculator', 'tab_view', `${currentCalculator}_${tabName}`);
}

function initializeCalculatorForm() {
    // Add real-time validation and formatting
    const inputs = document.querySelectorAll('#calculatorContent input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateInput(this);
        });

        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateInput(this);
            }
        });
    });
}

function validateInput(input) {
    const rawValue = input.value.trim();
    const value = rawValue === '' ? NaN : Number(rawValue);
    const minAttribute = input.getAttribute('min');
    const maxAttribute = input.getAttribute('max');
    const min = minAttribute === null ? null : Number(minAttribute);
    const max = maxAttribute === null ? null : Number(maxAttribute);
    let message = '';

    if (!Number.isFinite(value)) {
        message = 'Enter a valid number.';
    } else if (min !== null && value < min) {
        message = `Enter a value of at least ${minAttribute}.`;
    } else if (max !== null && value > max) {
        message = `Enter a value no greater than ${maxAttribute}.`;
    }

    const formGroup = input.closest('.form-group');
    let feedback = formGroup && formGroup.querySelector('.input-validation-error');
    if (message) {
        input.classList.add('error');
        input.setAttribute('aria-invalid', 'true');
        if (formGroup && !feedback) {
            feedback = document.createElement('span');
            feedback.className = 'form-error input-validation-error active';
            feedback.setAttribute('role', 'alert');
            input.insertAdjacentElement('afterend', feedback);
        }
        if (feedback) {
            feedback.textContent = message;
            feedback.classList.add('active');
        }
        return false;
    }

    input.classList.remove('error');
    input.removeAttribute('aria-invalid');
    if (feedback) {
        feedback.remove();
    }
    return true;
}

function runCalculator(calculatorId) {
    const def = CalculatorRegistry[calculatorId];
    if (!def) return;

    // Read and validate all fields
    const values = {};
    let isValid = true;
    let firstInvalidInput = null;

    def.fields.forEach(field => {
        const el = document.getElementById(`${calculatorId}__${field.id}`);
        if (!el) { isValid = false; return; }

        if (field.type === 'select') {
            values[field.id] = el.value;
            return;
        }

        if (!validateInput(el)) {
            isValid = false;
            firstInvalidInput ||= el;
        }
        values[field.id] = Number(el.value);
    });

    if (!isValid) {
        firstInvalidInput?.focus();
        return;
    }

    // Calculate
    let results;
    try {
        results = def.calculate(values);
    } catch (error) {
        console.error(`Calculator failed: ${calculatorId}`, error);
        showToast('Unable to calculate this result. Check the inputs and try again.', 'error');
        return;
    }

    // Render results
    const cardsHTML = results.cards.map(card => `
        <div class="result-card">
            <div class="result-label">${card.label}</div>
            <div class="result-value ${card.cls || ''}">${card.value}</div>
            ${card.subtext ? `<div class="result-subtext">${card.subtext}</div>` : ''}
        </div>
    `).join('');

    const resultsHTML = `
        <div class="results-header">${results.header || 'Analysis Results'}</div>
        <div class="results-grid">${cardsHTML}</div>
        <div class="recommendation-box">
            <h4>${results.recommendation.title}</h4>
            ${results.recommendation.body}
        </div>
    `;

    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.innerHTML = resultsHTML;
        resultsSection.classList.add('active');
    }
    document.getElementById('resultsContent').innerHTML = resultsHTML;

    // Save calculation if user is logged in
    if (Auth.isAuthenticated()) {
        saveCalculation(calculatorId, values, results);
    }

    // Track calculation
    trackEvent('Calculator', 'calculate', def.title);

    // Switch to the results tab
    switchTab(null, 'results');
}

// Backwards-compatible entry points
function calculateBuyVsRent() { runCalculator('buy-rent'); }
function calculateCompoundInterest() { runCalculator('compound-interest'); }

// ==========================================
// USER CALCULATIONS MANAGEMENT
// ==========================================

function saveCalculation(type, inputs, results) {
    const calculation = {
        id: Date.now(),
        type: type,
        inputs: inputs,
        results: results,
        timestamp: new Date().toISOString(),
        userId: currentUser.id
    };

    userCalculations.push(calculation);
    Storage.save('userCalculations_' + currentUser.id, userCalculations);

    showToast('Calculation saved successfully!', 'success');
}

function loadUserCalculations() {
    if (Auth.isAuthenticated()) {
        const saved = Storage.load('userCalculations_' + currentUser.id);
        userCalculations = saved || [];
    }
}

// ==========================================
// AUTH MODAL FUNCTIONS
// ==========================================

function openAuthModal(mode) {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const footerText = document.getElementById('authFooterText');
    const emailForm = document.getElementById('emailForm');

    if (mode === 'signup') {
        title.textContent = 'Create Your Free Account';
        footerText.textContent = 'Already have an account?';
    } else {
        title.textContent = 'Welcome to FinanceWise';
        footerText.textContent = "Don't have an account?";
    }

    emailForm.classList.add('active');
    document.getElementById('emailError').classList.remove('active');
    document.getElementById('passwordError').classList.remove('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
    document.getElementById('emailForm').classList.remove('active');
    document.getElementById('phoneForm').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function toggleAuthMode(e) {
    e.preventDefault();
    const title = document.getElementById('authTitle');
    const footerText = document.getElementById('authFooterText');

    if (title.textContent.includes('Welcome')) {
        title.textContent = 'Create Your Free Account';
        footerText.textContent = 'Already have an account?';
    } else {
        title.textContent = 'Welcome to FinanceWise';
        footerText.textContent = "Don't have an account?";
    }
}

function showEmailForm() {
    document.getElementById('emailForm').classList.add('active');
    document.getElementById('phoneForm').classList.remove('active');
}

function showPhoneForm() {
    document.getElementById('phoneForm').classList.add('active');
    document.getElementById('emailForm').classList.remove('active');
}

// ==========================================
// NAVBAR SCROLL EFFECT
// ==========================================

window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    Auth.updateAuthUI();

    // Load user calculations if logged in
    loadUserCalculations();

    // Close modals on outside click
    window.onclick = function(event) {
        if (event.target.classList.contains('modal') || event.target.classList.contains('auth-modal')) {
            event.target.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    };

    // Track page view
    trackEvent('Page', 'view', 'Homepage');

    console.log('FinanceWise initialized successfully');
    console.log('© 2026 Ravi Kumar Peela');
});
