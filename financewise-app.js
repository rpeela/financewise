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
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('emailAuthBtn');
    
    // Validate
    if (!validateEmail(email)) {
        document.getElementById('emailError').classList.add('active');
        return;
    }
    
    if (password.length < 8) {
        document.getElementById('passwordError').classList.add('active');
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
// CALCULATOR LOGIC
// ==========================================

const Calculators = {
    // Buy vs Rent Calculator
    buyVsRent: {
        calculate: function(inputs) {
            const {
                homePrice,
                downPaymentPct,
                interestRate,
                propertyTaxRate,
                maintenance,
                appreciationRate,
                monthlyRent,
                rentIncrease,
                investmentReturn,
                years
            } = inputs;
            
            // Buying calculations
            const downPayment = homePrice * (downPaymentPct / 100);
            const loanAmount = homePrice - downPayment;
            const monthlyInterestRate = (interestRate / 100) / 12;
            const numPayments = years * 12;
            
            // Monthly mortgage payment
            const monthlyMortgage = loanAmount * 
                (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numPayments)) / 
                (Math.pow(1 + monthlyInterestRate, numPayments) - 1);
            
            const monthlyPropertyTax = (homePrice * (propertyTaxRate / 100)) / 12;
            const monthlyInsurance = (homePrice * 0.003) / 12; // 0.3% of home value
            
            // Calculate total costs and equity
            let totalBuyingCost = downPayment + (homePrice * 0.03); // Closing costs
            let totalInterestPaid = 0;
            let totalPrincipalPaid = 0;
            let remainingBalance = loanAmount;
            
            for (let i = 0; i < numPayments; i++) {
                const interestPayment = remainingBalance * monthlyInterestRate;
                const principalPayment = monthlyMortgage - interestPayment;
                
                totalInterestPaid += interestPayment;
                totalPrincipalPaid += principalPayment;
                remainingBalance -= principalPayment;
                
                totalBuyingCost += monthlyMortgage + monthlyPropertyTax + monthlyInsurance + maintenance;
            }
            
            const futureHomeValue = homePrice * Math.pow(1 + (appreciationRate / 100), years);
            const homeEquity = futureHomeValue - remainingBalance;
            
            // Renting calculations
            let totalRentingCost = 0;
            let currentRent = monthlyRent;
            
            for (let year = 0; year < years; year++) {
                totalRentingCost += (currentRent + 30) * 12; // Add renter's insurance
                currentRent *= (1 + (rentIncrease / 100));
            }
            
            // Investment of down payment
            const investedDownPayment = downPayment * Math.pow(1 + (investmentReturn / 100), years);
            
            // Monthly difference invested
            const monthlyDifference = Math.max(0, (monthlyMortgage + monthlyPropertyTax + monthlyInsurance + maintenance) - monthlyRent);
            const monthlyInvestmentRate = (investmentReturn / 100) / 12;
            
            let investmentPortfolio = investedDownPayment;
            for (let i = 0; i < numPayments; i++) {
                investmentPortfolio += monthlyDifference;
                investmentPortfolio *= (1 + monthlyInvestmentRate);
            }
            
            // Net positions
            const buyingNetPosition = futureHomeValue - remainingBalance - totalBuyingCost + downPayment;
            const rentingNetPosition = investmentPortfolio - totalRentingCost;
            
            const difference = buyingNetPosition - rentingNetPosition;
            
            return {
                buying: {
                    totalCost: totalBuyingCost,
                    monthlyPayment: monthlyMortgage + monthlyPropertyTax + monthlyInsurance + maintenance,
                    homeValue: futureHomeValue,
                    equity: homeEquity,
                    interestPaid: totalInterestPaid,
                    netPosition: buyingNetPosition
                },
                renting: {
                    totalCost: totalRentingCost,
                    monthlyRent: monthlyRent,
                    finalRent: currentRent,
                    investmentValue: investmentPortfolio,
                    netPosition: rentingNetPosition
                },
                comparison: {
                    difference: difference,
                    winner: difference > 0 ? 'buying' : 'renting',
                    breakEvenYear: this.calculateBreakEven(inputs)
                }
            };
        },
        
        calculateBreakEven: function(inputs) {
            // Simplified break-even calculation
            const closingCosts = inputs.homePrice * 0.03;
            const monthlyBuying = (inputs.homePrice * (inputs.downPaymentPct / 100) * (inputs.interestRate / 100) / 12) + 
                                 (inputs.homePrice * (inputs.propertyTaxRate / 100) / 12) + 
                                 inputs.maintenance;
            const difference = monthlyBuying - inputs.monthlyRent;
            
            if (difference <= 0) return 0;
            
            return Math.ceil(closingCosts / difference / 12);
        }
    },
    
    // Compound Interest Calculator
    compoundInterest: {
        calculate: function(inputs) {
            const {
                principal,
                monthlyContribution,
                annualRate,
                years,
                compoundFrequency
            } = inputs;
            
            const periods = years * compoundFrequency;
            const ratePerPeriod = (annualRate / 100) / compoundFrequency;
            const contributionFreq = 12 / compoundFrequency;
            
            // Future value of principal
            const fvPrincipal = principal * Math.pow(1 + ratePerPeriod, periods);
            
            // Future value of contributions
            let fvContributions = 0;
            for (let i = 0; i < periods; i++) {
                const contribution = monthlyContribution * contributionFreq;
                fvContributions += contribution * Math.pow(1 + ratePerPeriod, periods - i);
            }
            
            const finalBalance = fvPrincipal + fvContributions;
            const totalContributed = principal + (monthlyContribution * 12 * years);
            const totalInterest = finalBalance - totalContributed;
            
            return {
                finalBalance: finalBalance,
                totalContributed: totalContributed,
                totalInterest: totalInterest,
                percentageGain: ((totalInterest / totalContributed) * 100)
            };
        }
    },
    
    // Emergency Fund Calculator
    emergencyFund: {
        calculate: function(inputs) {
            const {
                monthlyExpenses,
                incomeStability,
                dependents,
                dualIncome,
                healthCoverage
            } = inputs;
            
            let months = 3; // Base recommendation
            
            // Adjust for income stability
            if (incomeStability === 'variable') months += 3;
            else if (incomeStability === 'moderate') months += 1.5;
            else if (incomeStability === 'stable') months += 0.5;
            
            // Adjust for dependents
            months += (dependents * 0.5);
            
            // Adjust for dual income
            if (dualIncome === 'yes') months -= 1;
            
            // Adjust for health coverage
            if (healthCoverage === 'none') months += 1.5;
            else if (healthCoverage === 'basic') months += 0.5;
            
            months = Math.max(3, Math.min(12, months)); // Cap between 3-12 months
            
            const recommendedAmount = monthlyExpenses * months;
            
            return {
                recommendedMonths: months,
                recommendedAmount: recommendedAmount,
                monthlySavingsTarget: recommendedAmount / 12 // Spread over a year
            };
        }
    }
};

// ==========================================
// CALCULATOR UI MANAGEMENT
// ==========================================

let currentCalculator = null;

function openCalculator(calculatorId) {
    currentCalculator = calculatorId;
    const modal = document.getElementById('calculatorModal');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const calculatorContent = document.getElementById('calculatorContent');
    const guideContent = document.getElementById('guideContent');
    
    // Set calculator-specific content
    const calculatorConfig = getCalculatorConfig(calculatorId);
    
    modalIcon.textContent = calculatorConfig.icon;
    modalTitle.textContent = calculatorConfig.title;
    calculatorContent.innerHTML = calculatorConfig.form;
    guideContent.innerHTML = calculatorConfig.guide;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Initialize form listeners
    initializeCalculatorForm(calculatorId);
}

function closeCalculatorModal() {
    document.getElementById('calculatorModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentCalculator = null;
}

function switchTab(event, tabName) {
    // Update tabs
    document.querySelectorAll('.modal-tab').forEach(tab => tab.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Track tab view
    trackEvent('Calculator', 'tab_view', `${currentCalculator}_${tabName}`);
}

function getCalculatorConfig(calculatorId) {
    const configs = {
        'buy-rent': {
            icon: '🏠',
            title: 'Buy vs Rent Calculator',
            form: `
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Home Price ($)</label>
                        <input type="number" class="form-input" id="homePrice" value="400000" min="0" step="1000">
                        <span class="form-help">Current market value of the property</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Down Payment (%)</label>
                        <input type="number" class="form-input" id="downPayment" value="20" min="0" max="100" step="1">
                        <span class="form-help">20% recommended to avoid PMI</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Interest Rate (%)</label>
                        <input type="number" class="form-input" id="interestRate" value="6.5" min="0" max="20" step="0.1">
                        <span class="form-help">Current mortgage interest rate</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Property Tax Rate (%)</label>
                        <input type="number" class="form-input" id="propertyTax" value="1.2" min="0" max="5" step="0.1">
                        <span class="form-help">Annual property tax as % of home value</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Monthly Maintenance ($)</label>
                        <input type="number" class="form-input" id="maintenance" value="300" min="0" step="50">
                        <span class="form-help">HOA, repairs, maintenance reserves</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Home Appreciation (%/year)</label>
                        <input type="number" class="form-input" id="appreciation" value="3" min="-10" max="20" step="0.5">
                        <span class="form-help">Expected annual home value growth</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Monthly Rent ($)</label>
                        <input type="number" class="form-input" id="monthlyRent" value="2000" min="0" step="50">
                        <span class="form-help">Current comparable rental price</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Rent Increase (%/year)</label>
                        <input type="number" class="form-input" id="rentIncrease" value="3" min="0" max="20" step="0.5">
                        <span class="form-help">Expected annual rent growth</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Investment Return (%/year)</label>
                        <input type="number" class="form-input" id="investmentReturn" value="7" min="0" max="20" step="0.5">
                        <span class="form-help">Return if down payment invested instead</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Years to Compare</label>
                        <input type="number" class="form-input" id="years" value="10" min="1" max="30" step="1">
                        <span class="form-help">Time horizon for comparison</span>
                    </div>
                </div>
                <button class="btn btn-primary btn-large" onclick="calculateBuyVsRent()" style="width: 100%; justify-content: center; margin-top: 1rem;">
                    Calculate Comparison
                </button>
                <div id="resultsSection" class="results-section"></div>
            `,
            guide: `
                <h3>How to Use the Buy vs Rent Calculator</h3>
                <p>This calculator helps you make an informed decision about whether to buy or rent a home based on your specific financial situation.</p>
                <h4>Input Guidelines:</h4>
                <ul>
                    <li><strong>Home Price:</strong> Enter the purchase price of the home you're considering</li>
                    <li><strong>Down Payment:</strong> Typically 20% to avoid PMI insurance costs</li>
                    <li><strong>Interest Rate:</strong> Current mortgage rates (check bankrate.com)</li>
                    <li><strong>Property Tax:</strong> Varies by location (0.5-2.5% typically)</li>
                    <li><strong>Investment Return:</strong> Expected return if you invest your down payment (7-10% historical stock market average)</li>
                </ul>
            `
        },
        'compound-interest': {
            icon: '📈',
            title: 'Compound Interest Calculator',
            form: `
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Initial Investment ($)</label>
                        <input type="number" class="form-input" id="principal" value="10000" min="0" step="100">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Monthly Contribution ($)</label>
                        <input type="number" class="form-input" id="monthlyContribution" value="500" min="0" step="50">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Annual Interest Rate (%)</label>
                        <input type="number" class="form-input" id="annualRate" value="7" min="0" max="30" step="0.1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Time Period (years)</label>
                        <input type="number" class="form-input" id="yearsCI" value="30" min="1" max="50" step="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Compound Frequency</label>
                        <select class="form-select" id="compoundFrequency">
                            <option value="12">Monthly</option>
                            <option value="4">Quarterly</option>
                            <option value="1">Annually</option>
                            <option value="365">Daily</option>
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary btn-large" onclick="calculateCompoundInterest()" style="width: 100%; justify-content: center; margin-top: 1rem;">
                    Calculate Growth
                </button>
                <div id="resultsSection" class="results-section"></div>
            `,
            guide: `
                <h3>Understanding Compound Interest</h3>
                <p>Compound interest is the addition of interest to the principal sum, where the interest that has been added also earns interest.</p>
                <h4>Key Concepts:</h4>
                <ul>
                    <li><strong>Principal:</strong> Your initial investment amount</li>
                    <li><strong>Contributions:</strong> Regular additions to your investment</li>
                    <li><strong>Compound Frequency:</strong> How often interest is calculated and added</li>
                    <li><strong>Time:</strong> The longer your money compounds, the more it grows</li>
                </ul>
            `
        }
    };
    
    return configs[calculatorId] || configs['buy-rent'];
}

function initializeCalculatorForm(calculatorId) {
    // Add real-time validation and formatting
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateInput(this);
        });
        
        input.addEventListener('input', function() {
            // Remove error state on input
            this.classList.remove('error');
        });
    });
}

function validateInput(input) {
    const value = parseFloat(input.value);
    const min = parseFloat(input.getAttribute('min'));
    const max = parseFloat(input.getAttribute('max'));
    
    if (isNaN(value) || (min !== null && value < min) || (max !== null && value > max)) {
        input.classList.add('error');
        return false;
    }
    
    input.classList.remove('error');
    return true;
}

// Calculator Functions
function calculateBuyVsRent() {
    // Validate all inputs
    const inputs = {
        homePrice: parseFloat(document.getElementById('homePrice').value),
        downPaymentPct: parseFloat(document.getElementById('downPayment').value),
        interestRate: parseFloat(document.getElementById('interestRate').value),
        propertyTaxRate: parseFloat(document.getElementById('propertyTax').value),
        maintenance: parseFloat(document.getElementById('maintenance').value),
        appreciationRate: parseFloat(document.getElementById('appreciation').value),
        monthlyRent: parseFloat(document.getElementById('monthlyRent').value),
        rentIncrease: parseFloat(document.getElementById('rentIncrease').value),
        investmentReturn: parseFloat(document.getElementById('investmentReturn').value),
        years: parseInt(document.getElementById('years').value)
    };
    
    // Validate
    let isValid = true;
    for (let key in inputs) {
        if (isNaN(inputs[key])) {
            isValid = false;
            break;
        }
    }
    
    if (!isValid) {
        showToast('Please fill in all fields with valid numbers', 'error');
        return;
    }
    
    // Calculate
    const results = Calculators.buyVsRent.calculate(inputs);
    
    // Display results
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.innerHTML = `
        <div class="results-header">Analysis Results</div>
        <div class="results-grid">
            <div class="result-card">
                <div class="result-label">Buying Total Cost</div>
                <div class="result-value">${formatCurrency(results.buying.totalCost)}</div>
                <div class="result-subtext">Over ${inputs.years} years</div>
            </div>
            <div class="result-card">
                <div class="result-label">Home Equity Built</div>
                <div class="result-value positive">${formatCurrency(results.buying.equity)}</div>
                <div class="result-subtext">After ${inputs.years} years</div>
            </div>
            <div class="result-card">
                <div class="result-label">Renting Total Cost</div>
                <div class="result-value">${formatCurrency(results.renting.totalCost)}</div>
                <div class="result-subtext">Over ${inputs.years} years</div>
            </div>
            <div class="result-card">
                <div class="result-label">Investment Portfolio</div>
                <div class="result-value positive">${formatCurrency(results.renting.investmentValue)}</div>
                <div class="result-subtext">If down payment invested</div>
            </div>
        </div>
        <div class="recommendation-box">
            <h4>💡 Recommendation: ${results.comparison.winner === 'buying' ? 'Buying' : 'Renting'} is Better</h4>
            <p>Based on your inputs, ${results.comparison.winner === 'buying' ? 'buying' : 'renting'} comes out ahead by 
            ${formatCurrency(Math.abs(results.comparison.difference))} over ${inputs.years} years.</p>
            <p><strong>Break-even point:</strong> ${results.comparison.breakEvenYear} years</p>
            <p>This analysis considers home appreciation, opportunity costs, and all ownership expenses. 
            ${results.comparison.winner === 'buying' ? 
                'Buying builds equity and offers stability, but requires long-term commitment.' : 
                'Renting offers flexibility and your invested capital can potentially grow faster.'}</p>
        </div>
    `;
    resultsSection.classList.add('active');
    
    // Save calculation if user is logged in
    if (Auth.isAuthenticated()) {
        saveCalculation('buy-vs-rent', inputs, results);
    }
    
    // Track calculation
    trackEvent('Calculator', 'calculate', 'Buy vs Rent');
    
    // Switch to results tab
    switchTab(null, 'results');
    document.getElementById('resultsContent').innerHTML = resultsSection.innerHTML;
}

function calculateCompoundInterest() {
    const inputs = {
        principal: parseFloat(document.getElementById('principal').value),
        monthlyContribution: parseFloat(document.getElementById('monthlyContribution').value),
        annualRate: parseFloat(document.getElementById('annualRate').value),
        years: parseInt(document.getElementById('yearsCI').value),
        compoundFrequency: parseInt(document.getElementById('compoundFrequency').value)
    };
    
    const results = Calculators.compoundInterest.calculate(inputs);
    
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.innerHTML = `
        <div class="results-header">Investment Growth Projection</div>
        <div class="results-grid">
            <div class="result-card">
                <div class="result-label">Final Balance</div>
                <div class="result-value positive">${formatCurrency(results.finalBalance)}</div>
                <div class="result-subtext">After ${inputs.years} years</div>
            </div>
            <div class="result-card">
                <div class="result-label">Total Contributed</div>
                <div class="result-value">${formatCurrency(results.totalContributed)}</div>
                <div class="result-subtext">Your money invested</div>
            </div>
            <div class="result-card">
                <div class="result-label">Interest Earned</div>
                <div class="result-value positive">${formatCurrency(results.totalInterest)}</div>
                <div class="result-subtext">${formatPercentage(results.percentageGain)} gain</div>
            </div>
        </div>
        <div class="recommendation-box">
            <h4>💡 Power of Compound Interest</h4>
            <p>Your investment will grow to ${formatCurrency(results.finalBalance)} over ${inputs.years} years, 
            earning ${formatCurrency(results.totalInterest)} in compound interest.</p>
            <p>That's a ${formatPercentage(results.percentageGain)} return on your total contributions!</p>
            <p><strong>Key Insight:</strong> Starting early is crucial. Each year of delay can cost you tens of thousands in lost compound growth.</p>
        </div>
    `;
    resultsSection.classList.add('active');
    
    if (Auth.isAuthenticated()) {
        saveCalculation('compound-interest', inputs, results);
    }
    
    trackEvent('Calculator', 'calculate', 'Compound Interest');
    
    switchTab(null, 'results');
    document.getElementById('resultsContent').innerHTML = resultsSection.innerHTML;
}

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
    
    if (mode === 'signup') {
        title.textContent = 'Create Your Free Account';
        footerText.textContent = 'Already have an account?';
    } else {
        title.textContent = 'Welcome to FinanceWise';
        footerText.textContent = "Don't have an account?";
    }
    
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