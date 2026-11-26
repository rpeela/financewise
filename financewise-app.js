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
    } else {
        const tab = document.querySelector(`.modal-tab[onclick*="'${tabName}'"]`);
        if (tab) tab.classList.add('active');
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
    
    if (configs[calculatorId]) return configs[calculatorId];
    if (AdditionalCalculators[calculatorId]) return buildCalculatorConfig(calculatorId);
    return configs['buy-rent'];
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
// ADDITIONAL CALCULATORS
// ==========================================

// Monthly payment for an amortized loan
function monthlyLoanPayment(principal, annualRatePct, years) {
    const n = years * 12;
    const r = (annualRatePct / 100) / 12;
    if (principal <= 0 || n <= 0) return 0;
    if (r === 0) return principal / n;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// Total interest paid over the life of an amortized loan
function totalLoanInterest(principal, annualRatePct, years) {
    return monthlyLoanPayment(principal, annualRatePct, years) * years * 12 - principal;
}

// Simulate paying off a list of debts, rolling freed-up minimums into the next target
function simulateDebtPayoff(debts, extraPayment, order) {
    const balances = debts.map(d => d.balance);
    const totalMinimums = debts.reduce((sum, d) => sum + d.minPayment, 0);
    const budget = totalMinimums + extraPayment;
    const payoffOrder = debts.map((d, i) => i).sort(order);
    let months = 0;
    let totalInterest = 0;
    let firstPayoffMonth = 0;

    while (balances.some(b => b > 0.01) && months < 600) {
        months++;
        // Accrue interest
        balances.forEach((b, i) => {
            if (b > 0) {
                const interest = b * (debts[i].rate / 100) / 12;
                balances[i] += interest;
                totalInterest += interest;
            }
        });
        // Pay minimums
        let available = budget;
        balances.forEach((b, i) => {
            if (b > 0) {
                const payment = Math.min(debts[i].minPayment, b);
                balances[i] -= payment;
                available -= payment;
            }
        });
        // Put everything left toward the priority debt(s)
        for (const i of payoffOrder) {
            if (available <= 0) break;
            if (balances[i] > 0) {
                const payment = Math.min(available, balances[i]);
                balances[i] -= payment;
                available -= payment;
            }
        }
        if (!firstPayoffMonth && balances.some((b, i) => debts[i].balance > 0 && b <= 0.01)) {
            firstPayoffMonth = months;
        }
    }

    return { months: months, totalInterest: totalInterest, firstPayoffMonth: firstPayoffMonth, paidOff: months < 600 };
}

function formatMonths(months) {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years === 0) return `${rem} mo`;
    return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`;
}

const AdditionalCalculators = {
    'cash-on-cash': {
        icon: '🏘️',
        title: 'Cash on Cash Return Calculator',
        button: 'Calculate Return',
        fields: [
            { id: 'cocPrice', label: 'Purchase Price ($)', value: 300000, min: 0, step: 1000, help: 'Total property purchase price' },
            { id: 'cocDown', label: 'Down Payment (%)', value: 25, min: 0, max: 100, step: 1, help: 'Investment properties usually need 20-25%' },
            { id: 'cocClosing', label: 'Closing Costs ($)', value: 9000, min: 0, step: 500, help: 'Typically 2-5% of purchase price' },
            { id: 'cocRehab', label: 'Repairs / Rehab ($)', value: 10000, min: 0, step: 500, help: 'Upfront renovation costs' },
            { id: 'cocRate', label: 'Interest Rate (%)', value: 7, min: 0, max: 20, step: 0.1, help: 'Investment property mortgage rate' },
            { id: 'cocTerm', label: 'Loan Term (years)', value: 30, min: 1, max: 40, step: 1, help: 'Length of the mortgage' },
            { id: 'cocRent', label: 'Monthly Rent ($)', value: 2800, min: 0, step: 50, help: 'Expected gross monthly rent' },
            { id: 'cocVacancy', label: 'Vacancy Rate (%)', value: 5, min: 0, max: 100, step: 1, help: 'Share of the year the unit sits empty' },
            { id: 'cocExpenses', label: 'Monthly Operating Expenses ($)', value: 700, min: 0, step: 50, help: 'Taxes, insurance, management, repairs, HOA' }
        ],
        guide: `
            <h3>How to Use the Cash on Cash Return Calculator</h3>
            <p>Cash on cash return measures the annual pre-tax cash flow a rental property produces relative to the actual cash you invested.</p>
            <h4>Input Guidelines:</h4>
            <ul>
                <li><strong>Cash Invested:</strong> Down payment + closing costs + upfront repairs</li>
                <li><strong>Vacancy Rate:</strong> 5-8% is a common conservative assumption</li>
                <li><strong>Operating Expenses:</strong> Include property tax, insurance, property management (8-10% of rent), maintenance, and HOA</li>
            </ul>
            <h4>Benchmarks:</h4>
            <ul>
                <li><strong>8-12%:</strong> Generally considered a solid cash on cash return</li>
                <li><strong>Cap Rate:</strong> Measures property performance independent of financing</li>
            </ul>
        `,
        calculate: function(i) {
            const downPayment = i.cocPrice * (i.cocDown / 100);
            const loanAmount = i.cocPrice - downPayment;
            const mortgage = monthlyLoanPayment(loanAmount, i.cocRate, i.cocTerm);
            const effectiveRent = i.cocRent * (1 - i.cocVacancy / 100);
            const noi = (effectiveRent - i.cocExpenses) * 12;
            const annualCashFlow = noi - mortgage * 12;
            const cashInvested = downPayment + i.cocClosing + i.cocRehab;
            const coc = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
            const capRate = i.cocPrice > 0 ? (noi / i.cocPrice) * 100 : 0;
            const verdict = coc >= 8 ? 'Strong Investment' : coc >= 4 ? 'Moderate Investment' : coc >= 0 ? 'Weak Return' : 'Negative Cash Flow';

            return {
                header: 'Rental Property Returns',
                cards: [
                    { label: 'Cash on Cash Return', value: formatPercentage(coc), subtext: 'Annual cash flow ÷ cash invested', tone: coc >= 0 ? 'positive' : 'negative' },
                    { label: 'Annual Cash Flow', value: formatCurrency(annualCashFlow), subtext: `${formatCurrency(annualCashFlow / 12)} per month`, tone: annualCashFlow >= 0 ? 'positive' : 'negative' },
                    { label: 'Total Cash Invested', value: formatCurrency(cashInvested), subtext: 'Down payment + closing + rehab' },
                    { label: 'Cap Rate', value: formatPercentage(capRate), subtext: `NOI of ${formatCurrency(noi)}/year` }
                ],
                recommendation: {
                    title: `💡 ${verdict}`,
                    paragraphs: [
                        `This property generates ${formatCurrency(annualCashFlow)} per year in cash flow on ${formatCurrency(cashInvested)} invested, a ${formatPercentage(coc)} cash on cash return.`,
                        `<strong>Monthly mortgage payment:</strong> ${formatCurrency(mortgage)}`,
                        coc >= 8
                            ? 'This exceeds the common 8% benchmark. Double-check expense estimates and reserves before committing.'
                            : 'Consider negotiating a lower price, increasing rent, or reducing expenses to reach the 8-12% range most investors target.'
                    ]
                }
            };
        }
    },

    'credit-card': {
        icon: '💳',
        title: 'Credit Card Benefits Optimizer',
        button: 'Calculate Rewards',
        fields: [
            { id: 'ccGroceries', label: 'Monthly Groceries ($)', value: 600, min: 0, step: 25 },
            { id: 'ccGroceriesRate', label: 'Groceries Rewards (%)', value: 3, min: 0, max: 20, step: 0.5 },
            { id: 'ccDining', label: 'Monthly Dining ($)', value: 300, min: 0, step: 25 },
            { id: 'ccDiningRate', label: 'Dining Rewards (%)', value: 3, min: 0, max: 20, step: 0.5 },
            { id: 'ccGas', label: 'Monthly Gas / Transit ($)', value: 200, min: 0, step: 25 },
            { id: 'ccGasRate', label: 'Gas / Transit Rewards (%)', value: 2, min: 0, max: 20, step: 0.5 },
            { id: 'ccTravel', label: 'Monthly Travel ($)', value: 150, min: 0, step: 25 },
            { id: 'ccTravelRate', label: 'Travel Rewards (%)', value: 2, min: 0, max: 20, step: 0.5 },
            { id: 'ccOther', label: 'Monthly Other Spending ($)', value: 1000, min: 0, step: 50 },
            { id: 'ccOtherRate', label: 'Other Rewards (%)', value: 1, min: 0, max: 20, step: 0.5 },
            { id: 'ccFee', label: 'Annual Fee ($)', value: 95, min: 0, step: 5, help: 'Yearly card membership fee' },
            { id: 'ccBonus', label: 'Sign-up Bonus Value ($)', value: 200, min: 0, step: 50, help: 'One-time welcome offer (first year only)' },
            { id: 'ccCarried', label: 'Average Balance Carried ($)', value: 0, min: 0, step: 100, help: 'Enter 0 if you pay in full every month' },
            { id: 'ccApr', label: 'Card APR (%)', value: 24, min: 0, max: 40, step: 0.5, help: 'Interest rate charged on carried balances' }
        ],
        guide: `
            <h3>How to Use the Credit Card Benefits Optimizer</h3>
            <p>Enter your typical monthly spending by category and the reward rate your card (or the card you are considering) earns in each category.</p>
            <h4>Tips:</h4>
            <ul>
                <li><strong>Compare against 2% flat:</strong> The results show how your card stacks up against a no-fee 2% cash-back card</li>
                <li><strong>Annual fees:</strong> Only worth paying if extra rewards exceed the fee</li>
                <li><strong>Carrying a balance:</strong> Interest charges almost always wipe out rewards — pay in full each month</li>
            </ul>
        `,
        calculate: function(i) {
            const categories = [
                [i.ccGroceries, i.ccGroceriesRate],
                [i.ccDining, i.ccDiningRate],
                [i.ccGas, i.ccGasRate],
                [i.ccTravel, i.ccTravelRate],
                [i.ccOther, i.ccOtherRate]
            ];
            const annualSpend = categories.reduce((sum, [spend]) => sum + spend * 12, 0);
            const annualRewards = categories.reduce((sum, [spend, rate]) => sum + spend * 12 * (rate / 100), 0);
            const interestCost = i.ccCarried * (i.ccApr / 100);
            const ongoingValue = annualRewards - i.ccFee - interestCost;
            const firstYearValue = ongoingValue + i.ccBonus;
            const effectiveRate = annualSpend > 0 ? (ongoingValue / annualSpend) * 100 : 0;
            const flatValue = annualSpend * 0.02 - interestCost;
            const beatsFlat = ongoingValue >= flatValue;

            return {
                header: 'Rewards Analysis',
                cards: [
                    { label: 'Annual Rewards Earned', value: formatCurrency(annualRewards), subtext: `On ${formatCurrency(annualSpend)} yearly spend`, tone: 'positive' },
                    { label: 'Net Value (Ongoing)', value: formatCurrency(ongoingValue), subtext: 'After fees and interest', tone: ongoingValue >= 0 ? 'positive' : 'negative' },
                    { label: 'First-Year Value', value: formatCurrency(firstYearValue), subtext: 'Including sign-up bonus', tone: firstYearValue >= 0 ? 'positive' : 'negative' },
                    { label: 'Effective Reward Rate', value: formatPercentage(effectiveRate), subtext: 'Net value ÷ total spend' }
                ],
                recommendation: {
                    title: `💡 ${beatsFlat ? 'Your Card Beats a 2% Flat Card' : 'A 2% Flat Card Would Earn More'}`,
                    paragraphs: [
                        `A no-fee 2% cash-back card would return ${formatCurrency(flatValue)} per year on the same spending, versus ${formatCurrency(ongoingValue)} with this card — a difference of ${formatCurrency(Math.abs(ongoingValue - flatValue))}.`,
                        interestCost > 0
                            ? `<strong>Warning:</strong> Carrying a balance costs about ${formatCurrency(interestCost)} per year in interest. Paying in full is the single biggest way to improve your rewards value.`
                            : 'You pay in full each month, so you keep every dollar of rewards. Great habit!'
                    ]
                }
            };
        }
    },

    'debt-payoff': {
        icon: '🎯',
        title: 'Debt Payoff Planner',
        button: 'Compare Strategies',
        fields: [
            { id: 'debt1Balance', label: 'Debt 1 Balance ($)', value: 5000, min: 0, step: 100, help: 'e.g. Credit card' },
            { id: 'debt1Rate', label: 'Debt 1 Interest Rate (%)', value: 22, min: 0, max: 40, step: 0.1 },
            { id: 'debt1Min', label: 'Debt 1 Minimum Payment ($)', value: 150, min: 0, step: 10 },
            { id: 'debt2Balance', label: 'Debt 2 Balance ($)', value: 12000, min: 0, step: 100, help: 'e.g. Car loan' },
            { id: 'debt2Rate', label: 'Debt 2 Interest Rate (%)', value: 7, min: 0, max: 40, step: 0.1 },
            { id: 'debt2Min', label: 'Debt 2 Minimum Payment ($)', value: 300, min: 0, step: 10 },
            { id: 'debt3Balance', label: 'Debt 3 Balance ($)', value: 2000, min: 0, step: 100, help: 'e.g. Store card or personal loan' },
            { id: 'debt3Rate', label: 'Debt 3 Interest Rate (%)', value: 15, min: 0, max: 40, step: 0.1 },
            { id: 'debt3Min', label: 'Debt 3 Minimum Payment ($)', value: 60, min: 0, step: 10 },
            { id: 'debtExtra', label: 'Extra Monthly Payment ($)', value: 200, min: 0, step: 25, help: 'Amount above minimums you can put toward debt' }
        ],
        guide: `
            <h3>Snowball vs Avalanche</h3>
            <p>Enter up to three debts (set unused balances to 0) and any extra amount you can pay each month.</p>
            <h4>Strategies:</h4>
            <ul>
                <li><strong>Avalanche:</strong> Pay extra toward the highest interest rate first. Mathematically saves the most money.</li>
                <li><strong>Snowball:</strong> Pay extra toward the smallest balance first. Delivers quick wins that keep you motivated.</li>
                <li><strong>Rollover:</strong> When a debt is paid off, its minimum payment rolls into the next target in both strategies</li>
            </ul>
        `,
        calculate: function(i) {
            const debts = [1, 2, 3]
                .map(n => ({ balance: i[`debt${n}Balance`], rate: i[`debt${n}Rate`], minPayment: i[`debt${n}Min`] }))
                .filter(d => d.balance > 0);
            const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);

            if (debts.length === 0) {
                return { error: 'Enter at least one debt balance greater than 0' };
            }
            if (debts.some(d => d.minPayment + i.debtExtra <= d.balance * (d.rate / 100) / 12)) {
                return { error: 'Payments are too low to cover monthly interest. Increase the minimum or extra payment.' };
            }

            const avalanche = simulateDebtPayoff(debts, i.debtExtra, (a, b) => debts[b].rate - debts[a].rate);
            const snowball = simulateDebtPayoff(debts, i.debtExtra, (a, b) => debts[a].balance - debts[b].balance);
            const savings = snowball.totalInterest - avalanche.totalInterest;

            if (!avalanche.paidOff) {
                return { error: 'These debts would take more than 50 years to repay. Increase your monthly payments.' };
            }

            return {
                header: 'Debt Freedom Plan',
                cards: [
                    { label: 'Total Debt', value: formatCurrency(totalDebt), subtext: `Across ${debts.length} debt${debts.length > 1 ? 's' : ''}` },
                    { label: 'Avalanche Payoff', value: formatMonths(avalanche.months), subtext: `${formatCurrency(avalanche.totalInterest)} interest`, tone: 'positive' },
                    { label: 'Snowball Payoff', value: formatMonths(snowball.months), subtext: `${formatCurrency(snowball.totalInterest)} interest` },
                    { label: 'Avalanche Saves', value: formatCurrency(savings), subtext: 'In interest vs snowball', tone: 'positive' }
                ],
                recommendation: {
                    title: `💡 Recommendation: ${savings > 50 ? 'Avalanche Method' : 'Either Method Works'}`,
                    paragraphs: [
                        `Paying ${formatCurrency(debts.reduce((s, d) => s + d.minPayment, 0) + i.debtExtra)} per month, you'll be debt-free in ${formatMonths(avalanche.months)} with the avalanche method.`,
                        `With the snowball method, your first debt is gone in ${formatMonths(snowball.firstPayoffMonth)} (vs ${formatMonths(avalanche.firstPayoffMonth)} with avalanche).`,
                        savings > 50
                            ? `Avalanche saves ${formatCurrency(savings)} in interest. Choose snowball only if early wins are important to stay motivated.`
                            : 'The interest difference is small, so pick the strategy that keeps you motivated.'
                    ]
                }
            };
        }
    },

    'emergency-fund': {
        icon: '🛟',
        title: 'Emergency Fund Calculator',
        button: 'Calculate My Safety Net',
        fields: [
            { id: 'efExpenses', label: 'Monthly Essential Expenses ($)', value: 4000, min: 0, step: 100, help: 'Housing, food, utilities, insurance, debt minimums' },
            { id: 'efSavings', label: 'Current Emergency Savings ($)', value: 5000, min: 0, step: 100, help: 'Cash available in savings today' },
            { id: 'efMonthlySave', label: 'Monthly Amount You Can Save ($)', value: 500, min: 0, step: 50, help: 'Used to estimate time to reach your goal' },
            { id: 'efStability', label: 'Income Stability', type: 'select', value: 'stable', options: [['stable', 'Stable (salaried)'], ['moderate', 'Moderate (some variability)'], ['variable', 'Variable (freelance / commission)']] },
            { id: 'efDependents', label: 'Number of Dependents', value: 0, min: 0, max: 10, step: 1 },
            { id: 'efDualIncome', label: 'Dual-Income Household?', type: 'select', value: 'no', options: [['no', 'No'], ['yes', 'Yes']] },
            { id: 'efHealth', label: 'Health Coverage', type: 'select', value: 'good', options: [['good', 'Comprehensive'], ['basic', 'Basic / high deductible'], ['none', 'None']] }
        ],
        guide: `
            <h3>Building Your Emergency Fund</h3>
            <p>An emergency fund covers essential expenses if you lose income or face an unexpected bill. This calculator personalizes the classic 3-6 month rule.</p>
            <h4>Factors Considered:</h4>
            <ul>
                <li><strong>Income Stability:</strong> Variable income needs a bigger cushion</li>
                <li><strong>Dependents:</strong> Each dependent adds to your recommended buffer</li>
                <li><strong>Dual Income:</strong> A second earner reduces risk</li>
                <li><strong>Health Coverage:</strong> Limited coverage means higher potential medical costs</li>
            </ul>
            <p>Keep your emergency fund in a high-yield savings account for easy access.</p>
        `,
        calculate: function(i) {
            const base = Calculators.emergencyFund.calculate({
                monthlyExpenses: i.efExpenses,
                incomeStability: i.efStability,
                dependents: i.efDependents,
                dualIncome: i.efDualIncome,
                healthCoverage: i.efHealth
            });
            const gap = Math.max(0, base.recommendedAmount - i.efSavings);
            const monthsCovered = i.efExpenses > 0 ? i.efSavings / i.efExpenses : 0;
            const monthsToGoal = gap > 0 && i.efMonthlySave > 0 ? Math.ceil(gap / i.efMonthlySave) : 0;

            return {
                header: 'Your Emergency Fund Target',
                cards: [
                    { label: 'Recommended Fund', value: formatCurrency(base.recommendedAmount), subtext: `${base.recommendedMonths.toFixed(1)} months of expenses`, tone: 'positive' },
                    { label: 'Current Coverage', value: `${monthsCovered.toFixed(1)} mo`, subtext: `${formatCurrency(i.efSavings)} saved` },
                    { label: 'Remaining Gap', value: formatCurrency(gap), subtext: gap > 0 ? 'Still needed' : 'Goal reached!', tone: gap > 0 ? 'negative' : 'positive' },
                    { label: 'Time to Goal', value: gap === 0 ? 'Done' : (monthsToGoal ? formatMonths(monthsToGoal) : '—'), subtext: `Saving ${formatCurrency(i.efMonthlySave)}/month` }
                ],
                recommendation: {
                    title: `💡 ${gap === 0 ? 'You\'re Fully Protected' : 'Keep Building Your Safety Net'}`,
                    paragraphs: [
                        `Based on your situation, aim for ${base.recommendedMonths.toFixed(1)} months of essential expenses, or ${formatCurrency(base.recommendedAmount)}.`,
                        gap === 0
                            ? 'Your emergency fund is complete. Consider directing extra savings toward retirement or investing.'
                            : (i.efMonthlySave > 0
                                ? `Saving ${formatCurrency(i.efMonthlySave)} per month, you'll close the ${formatCurrency(gap)} gap in about ${formatMonths(monthsToGoal)}.`
                                : 'Set up an automatic monthly transfer to start closing the gap.')
                    ]
                }
            };
        }
    },

    'mortgage-affordability': {
        icon: '🔑',
        title: 'Mortgage Affordability Calculator',
        button: 'Calculate Buying Power',
        fields: [
            { id: 'maIncome', label: 'Annual Gross Income ($)', value: 120000, min: 0, step: 1000, help: 'Household income before taxes' },
            { id: 'maDebts', label: 'Monthly Debt Payments ($)', value: 500, min: 0, step: 50, help: 'Car, student loans, card minimums (not rent)' },
            { id: 'maDown', label: 'Down Payment Available ($)', value: 60000, min: 0, step: 1000 },
            { id: 'maRate', label: 'Interest Rate (%)', value: 6.5, min: 0, max: 20, step: 0.1 },
            { id: 'maTerm', label: 'Loan Term (years)', value: 30, min: 1, max: 40, step: 1 },
            { id: 'maTax', label: 'Property Tax Rate (%)', value: 1.2, min: 0, max: 5, step: 0.1, help: 'Annual tax as % of home value' },
            { id: 'maInsurance', label: 'Annual Home Insurance ($)', value: 1500, min: 0, step: 100 },
            { id: 'maHoa', label: 'Monthly HOA ($)', value: 0, min: 0, step: 25 }
        ],
        guide: `
            <h3>How Much House Can You Afford?</h3>
            <p>Lenders typically use the 28/36 rule: housing costs should stay under 28% of gross monthly income, and total debt payments under 36%.</p>
            <h4>What's Included:</h4>
            <ul>
                <li><strong>PITI:</strong> Principal, interest, property taxes, and insurance, plus HOA dues</li>
                <li><strong>Existing debts:</strong> Reduce how much of the 36% limit is left for housing</li>
                <li><strong>Down payment:</strong> Less than 20% usually means paying PMI, which isn't included here</li>
            </ul>
        `,
        calculate: function(i) {
            const monthlyIncome = i.maIncome / 12;
            const maxPayment = Math.max(0, Math.min(monthlyIncome * 0.28, monthlyIncome * 0.36 - i.maDebts));
            const paymentFactor = monthlyLoanPayment(1, i.maRate, i.maTerm);
            const taxFactor = (i.maTax / 100) / 12;
            const fixedCosts = i.maInsurance / 12 + i.maHoa;
            // maxPayment = (price - down) * paymentFactor + price * taxFactor + fixedCosts
            const maxPrice = Math.max(0, (maxPayment - fixedCosts + i.maDown * paymentFactor) / (paymentFactor + taxFactor));
            const homePrice = Math.max(maxPrice, 0);
            const loanAmount = Math.max(0, homePrice - i.maDown);
            const principalInterest = loanAmount * paymentFactor;
            const downPct = homePrice > 0 ? (Math.min(i.maDown, homePrice) / homePrice) * 100 : 0;
            const dti = monthlyIncome > 0 ? ((maxPayment + i.maDebts) / monthlyIncome) * 100 : 0;

            return {
                header: 'Your Buying Power',
                cards: [
                    { label: 'Maximum Home Price', value: formatCurrency(homePrice), subtext: `With ${formatCurrency(i.maDown)} down`, tone: 'positive' },
                    { label: 'Max Monthly Payment', value: formatCurrency(maxPayment), subtext: 'Including taxes, insurance, HOA' },
                    { label: 'Loan Amount', value: formatCurrency(loanAmount), subtext: `P&I: ${formatCurrency(principalInterest)}/month` },
                    { label: 'Debt-to-Income Ratio', value: formatPercentage(dti, 1), subtext: 'Lender limit is typically 36-43%' }
                ],
                recommendation: {
                    title: '💡 Affordability Summary',
                    paragraphs: [
                        `Following the 28/36 rule, you can afford a home up to about ${formatCurrency(homePrice)} with a total housing payment of ${formatCurrency(maxPayment)} per month.`,
                        downPct < 20 && homePrice > 0
                            ? `Your down payment is ${formatPercentage(downPct, 1)} of the price. Below 20%, expect PMI (roughly 0.5-1% of the loan per year), which lowers this budget.`
                            : 'Your down payment is at least 20%, so you should avoid PMI.',
                        '<strong>Tip:</strong> Being approved for an amount doesn\'t mean you should borrow it all. Leave room for savings and emergencies.'
                    ]
                }
            };
        }
    },

    'retirement': {
        icon: '🏖️',
        title: 'Retirement Savings Planner',
        button: 'Project My Retirement',
        fields: [
            { id: 'retAge', label: 'Current Age', value: 35, min: 16, max: 90, step: 1 },
            { id: 'retRetireAge', label: 'Retirement Age', value: 65, min: 30, max: 100, step: 1 },
            { id: 'retSavings', label: 'Current Retirement Savings ($)', value: 50000, min: 0, step: 1000, help: '401(k), IRA, and other retirement accounts' },
            { id: 'retMonthly', label: 'Your Monthly Contribution ($)', value: 800, min: 0, step: 50 },
            { id: 'retMatch', label: 'Employer Monthly Match ($)', value: 300, min: 0, step: 25 },
            { id: 'retReturn', label: 'Expected Annual Return (%)', value: 7, min: 0, max: 20, step: 0.5 },
            { id: 'retInflation', label: 'Inflation Rate (%)', value: 3, min: 0, max: 15, step: 0.5 },
            { id: 'retIncome', label: 'Desired Annual Retirement Income ($)', value: 70000, min: 0, step: 1000, help: "In today's dollars" },
            { id: 'retWithdrawal', label: 'Safe Withdrawal Rate (%)', value: 4, min: 1, max: 10, step: 0.25, help: 'The 4% rule is a common guideline' }
        ],
        guide: `
            <h3>Planning for Retirement</h3>
            <p>This planner projects your retirement savings and compares them to what you'll need to fund your desired lifestyle.</p>
            <h4>Key Assumptions:</h4>
            <ul>
                <li><strong>Target nest egg:</strong> Desired income (adjusted for inflation) ÷ withdrawal rate</li>
                <li><strong>Employer match:</strong> Free money — always contribute enough to get the full match</li>
                <li><strong>Returns:</strong> 6-8% is a common long-term assumption for a diversified portfolio</li>
            </ul>
        `,
        calculate: function(i) {
            const years = i.retRetireAge - i.retAge;
            if (years <= 0) {
                return { error: 'Retirement age must be greater than your current age' };
            }
            const months = years * 12;
            const r = (i.retReturn / 100) / 12;
            const contribution = i.retMonthly + i.retMatch;
            const growth = Math.pow(1 + r, months);
            const fvContributions = r === 0 ? contribution * months : contribution * (growth - 1) / r;
            const projected = i.retSavings * growth + fvContributions;
            const futureIncome = i.retIncome * Math.pow(1 + i.retInflation / 100, years);
            const needed = futureIncome / (i.retWithdrawal / 100);
            const gap = needed - projected;
            const extraNeeded = gap > 0 ? (r === 0 ? gap / months : gap * r / (growth - 1)) : 0;
            const sustainableIncome = projected * (i.retWithdrawal / 100) / Math.pow(1 + i.retInflation / 100, years);

            return {
                header: 'Retirement Projection',
                cards: [
                    { label: 'Projected Savings', value: formatCurrency(projected), subtext: `At age ${i.retRetireAge}`, tone: 'positive' },
                    { label: 'Target Nest Egg', value: formatCurrency(needed), subtext: 'To fund desired income' },
                    { label: gap > 0 ? 'Shortfall' : 'Surplus', value: formatCurrency(Math.abs(gap)), subtext: gap > 0 ? 'Below your target' : 'Above your target', tone: gap > 0 ? 'negative' : 'positive' },
                    { label: 'Sustainable Income', value: formatCurrency(sustainableIncome), subtext: "Per year, in today's dollars" }
                ],
                recommendation: {
                    title: `💡 ${gap > 0 ? 'Boost Your Savings' : 'You\'re On Track'}`,
                    paragraphs: [
                        `Contributing ${formatCurrency(contribution)} per month (including employer match) for ${years} years, your savings could grow to ${formatCurrency(projected)}.`,
                        gap > 0
                            ? `To reach your goal, increase contributions by about ${formatCurrency(extraNeeded)} per month, retire later, or adjust your income target.`
                            : `You're projected to exceed your goal by ${formatCurrency(-gap)}. You may be able to retire earlier or spend more in retirement.`
                    ]
                }
            };
        }
    },

    'net-worth': {
        icon: '💎',
        title: 'Net Worth Tracker',
        button: 'Calculate Net Worth',
        fields: [
            { id: 'nwCash', label: 'Cash & Savings ($)', value: 15000, min: 0, step: 500, help: 'Checking, savings, CDs' },
            { id: 'nwInvest', label: 'Investments ($)', value: 40000, min: 0, step: 500, help: 'Brokerage accounts, stocks, crypto' },
            { id: 'nwRetire', label: 'Retirement Accounts ($)', value: 85000, min: 0, step: 500, help: '401(k), IRA, pension value' },
            { id: 'nwHome', label: 'Real Estate Value ($)', value: 350000, min: 0, step: 1000 },
            { id: 'nwVehicles', label: 'Vehicles ($)', value: 20000, min: 0, step: 500 },
            { id: 'nwOtherAssets', label: 'Other Assets ($)', value: 5000, min: 0, step: 500, help: 'Jewelry, collectibles, business equity' },
            { id: 'nwMortgage', label: 'Mortgage Balance ($)', value: 260000, min: 0, step: 1000 },
            { id: 'nwAuto', label: 'Auto Loans ($)', value: 12000, min: 0, step: 500 },
            { id: 'nwStudent', label: 'Student Loans ($)', value: 18000, min: 0, step: 500 },
            { id: 'nwCards', label: 'Credit Card Debt ($)', value: 3000, min: 0, step: 100 },
            { id: 'nwOtherDebt', label: 'Other Debts ($)', value: 0, min: 0, step: 100 }
        ],
        guide: `
            <h3>Tracking Your Net Worth</h3>
            <p>Net worth is everything you own minus everything you owe. Tracking it over time is the best single measure of financial progress.</p>
            <h4>Tips:</h4>
            <ul>
                <li><strong>Use current market values:</strong> What you could sell assets for today</li>
                <li><strong>Liquid net worth:</strong> Excludes home and vehicles — shows what's accessible</li>
                <li><strong>Update quarterly:</strong> Focus on the trend, not any single number</li>
            </ul>
        `,
        calculate: function(i) {
            const assets = i.nwCash + i.nwInvest + i.nwRetire + i.nwHome + i.nwVehicles + i.nwOtherAssets;
            const liabilities = i.nwMortgage + i.nwAuto + i.nwStudent + i.nwCards + i.nwOtherDebt;
            const netWorth = assets - liabilities;
            const liquid = i.nwCash + i.nwInvest - i.nwCards - i.nwOtherDebt;
            const debtRatio = assets > 0 ? (liabilities / assets) * 100 : 0;

            return {
                header: 'Your Net Worth Snapshot',
                cards: [
                    { label: 'Net Worth', value: formatCurrency(netWorth), subtext: 'Assets minus liabilities', tone: netWorth >= 0 ? 'positive' : 'negative' },
                    { label: 'Total Assets', value: formatCurrency(assets), subtext: 'Everything you own' },
                    { label: 'Total Liabilities', value: formatCurrency(liabilities), subtext: 'Everything you owe' },
                    { label: 'Debt-to-Asset Ratio', value: formatPercentage(debtRatio, 1), subtext: 'Lower is healthier', tone: debtRatio > 50 ? 'negative' : 'positive' }
                ],
                recommendation: {
                    title: `💡 ${netWorth >= 0 ? 'Positive Net Worth' : 'Focus on Reducing Debt'}`,
                    paragraphs: [
                        `Your net worth is ${formatCurrency(netWorth)}, and your liquid net worth (cash and investments minus consumer debt) is ${formatCurrency(liquid)}.`,
                        i.nwCards > 0
                            ? `Paying off ${formatCurrency(i.nwCards)} in high-interest credit card debt is one of the fastest ways to grow your net worth.`
                            : 'You have no credit card debt — keep directing surplus cash toward investments and retirement.',
                        debtRatio > 50
                            ? 'Your debt-to-asset ratio is above 50%. Prioritizing debt payoff will strengthen your financial position.'
                            : 'Your debt-to-asset ratio is in a healthy range.'
                    ]
                }
            };
        }
    },

    'refinance': {
        icon: '🔄',
        title: 'Refinance Analyzer',
        button: 'Analyze Refinance',
        fields: [
            { id: 'refBalance', label: 'Current Loan Balance ($)', value: 300000, min: 0, step: 1000 },
            { id: 'refCurrentRate', label: 'Current Interest Rate (%)', value: 7.5, min: 0, max: 20, step: 0.05 },
            { id: 'refRemaining', label: 'Years Remaining on Loan', value: 27, min: 1, max: 40, step: 1 },
            { id: 'refNewRate', label: 'New Interest Rate (%)', value: 6.25, min: 0, max: 20, step: 0.05 },
            { id: 'refNewTerm', label: 'New Loan Term (years)', value: 30, min: 1, max: 40, step: 1 },
            { id: 'refCosts', label: 'Closing Costs ($)', value: 6000, min: 0, step: 250, help: 'Typically 2-5% of the loan amount' }
        ],
        guide: `
            <h3>Should You Refinance?</h3>
            <p>Refinancing replaces your current mortgage with a new one, ideally at a lower rate. The key question is how long it takes for monthly savings to repay the closing costs.</p>
            <h4>Key Metrics:</h4>
            <ul>
                <li><strong>Break-even point:</strong> Closing costs ÷ monthly savings</li>
                <li><strong>Lifetime interest:</strong> A longer new term can lower payments but increase total interest</li>
                <li><strong>Rule of thumb:</strong> Refinance if you'll stay in the home well past the break-even point</li>
            </ul>
        `,
        calculate: function(i) {
            const currentPayment = monthlyLoanPayment(i.refBalance, i.refCurrentRate, i.refRemaining);
            const newPayment = monthlyLoanPayment(i.refBalance, i.refNewRate, i.refNewTerm);
            const monthlySavings = currentPayment - newPayment;
            const breakEven = monthlySavings > 0 ? Math.ceil(i.refCosts / monthlySavings) : null;
            const currentInterest = totalLoanInterest(i.refBalance, i.refCurrentRate, i.refRemaining);
            const newInterest = totalLoanInterest(i.refBalance, i.refNewRate, i.refNewTerm);
            const lifetimeSavings = currentInterest - newInterest - i.refCosts;
            const worthIt = breakEven !== null && breakEven <= 60 && lifetimeSavings > 0;

            return {
                header: 'Refinance Analysis',
                cards: [
                    { label: 'Monthly Savings', value: formatCurrency(monthlySavings), subtext: `${formatCurrency(currentPayment)} → ${formatCurrency(newPayment)}`, tone: monthlySavings >= 0 ? 'positive' : 'negative' },
                    { label: 'Break-Even Point', value: breakEven !== null ? formatMonths(breakEven) : 'Never', subtext: 'Time to recover closing costs' },
                    { label: 'Lifetime Net Savings', value: formatCurrency(lifetimeSavings), subtext: 'Interest saved minus closing costs', tone: lifetimeSavings >= 0 ? 'positive' : 'negative' },
                    { label: 'New Total Interest', value: formatCurrency(newInterest), subtext: `vs ${formatCurrency(currentInterest)} currently` }
                ],
                recommendation: {
                    title: `💡 ${worthIt ? 'Refinancing Looks Worthwhile' : 'Refinancing May Not Pay Off'}`,
                    paragraphs: [
                        breakEven !== null
                            ? `You'd save ${formatCurrency(monthlySavings)} per month and recover your ${formatCurrency(i.refCosts)} closing costs in ${formatMonths(breakEven)}.`
                            : 'The new loan would not lower your monthly payment, so closing costs would never be recovered through monthly savings.',
                        lifetimeSavings < 0
                            ? `Note: Extending your term means paying ${formatCurrency(-lifetimeSavings)} more over the life of the loan. Consider a shorter term or making extra payments.`
                            : `Over the life of the loan, you'd come out ${formatCurrency(lifetimeSavings)} ahead.`
                    ]
                }
            };
        }
    },

    'investment-return': {
        icon: '📊',
        title: 'Investment Return Calculator',
        button: 'Calculate Returns',
        fields: [
            { id: 'irInitial', label: 'Amount Invested ($)', value: 25000, min: 0, step: 500, help: 'Total cost basis' },
            { id: 'irFinal', label: 'Current / Final Value ($)', value: 42000, min: 0, step: 500 },
            { id: 'irIncome', label: 'Dividends / Income Received ($)', value: 2500, min: 0, step: 100, help: 'Cash distributions not reinvested' },
            { id: 'irFees', label: 'Total Fees & Commissions ($)', value: 300, min: 0, step: 50 },
            { id: 'irYears', label: 'Holding Period (years)', value: 5, min: 0.1, max: 100, step: 0.5 },
            { id: 'irTaxRate', label: 'Capital Gains Tax Rate (%)', value: 15, min: 0, max: 50, step: 1, help: '0%, 15%, or 20% for long-term gains in the US' }
        ],
        guide: `
            <h3>Measuring Investment Performance</h3>
            <p>This calculator shows your total and annualized returns so you can compare investments held for different lengths of time.</p>
            <h4>Key Metrics:</h4>
            <ul>
                <li><strong>Total ROI:</strong> Overall gain as a percentage of what you invested</li>
                <li><strong>Annualized Return (CAGR):</strong> The equivalent steady yearly growth rate</li>
                <li><strong>After-tax gain:</strong> What you actually keep after capital gains taxes</li>
            </ul>
        `,
        calculate: function(i) {
            if (i.irInitial <= 0) {
                return { error: 'Amount invested must be greater than 0' };
            }
            const totalReturn = i.irFinal + i.irIncome - i.irFees;
            const gain = totalReturn - i.irInitial;
            const roi = (gain / i.irInitial) * 100;
            const cagr = totalReturn > 0 ? (Math.pow(totalReturn / i.irInitial, 1 / i.irYears) - 1) * 100 : -100;
            const tax = Math.max(0, gain) * (i.irTaxRate / 100);
            const afterTaxGain = gain - tax;
            const benchmark = i.irInitial * Math.pow(1.10, i.irYears) - i.irInitial;

            return {
                header: 'Investment Performance',
                cards: [
                    { label: 'Total Gain', value: formatCurrency(gain), subtext: 'Net of fees, incl. income', tone: gain >= 0 ? 'positive' : 'negative' },
                    { label: 'Total ROI', value: formatPercentage(roi), subtext: `Over ${i.irYears} years`, tone: roi >= 0 ? 'positive' : 'negative' },
                    { label: 'Annualized Return', value: formatPercentage(cagr), subtext: 'Compound annual growth rate', tone: cagr >= 0 ? 'positive' : 'negative' },
                    { label: 'After-Tax Gain', value: formatCurrency(afterTaxGain), subtext: `${formatCurrency(tax)} estimated tax` }
                ],
                recommendation: {
                    title: `💡 ${cagr >= 10 ? 'Market-Beating Performance' : cagr >= 0 ? 'Positive Returns' : 'Investment Lost Value'}`,
                    paragraphs: [
                        `Your investment returned ${formatPercentage(cagr)} per year on average, for a total gain of ${formatCurrency(gain)}.`,
                        `For comparison, the S&P 500's long-run average of ~10% per year would have earned about ${formatCurrency(benchmark)} over the same period.`,
                        i.irFees > 0 ? `Fees reduced your return by ${formatCurrency(i.irFees)}. Low-cost index funds can help keep more of your gains.` : ''
                    ]
                }
            };
        }
    },

    'payment-method': {
        icon: '💵',
        title: 'Payment Method Comparator',
        button: 'Compare Payment Methods',
        fields: [
            { id: 'pmSpend', label: 'Monthly Spending ($)', value: 2500, min: 0, step: 100 },
            { id: 'pmCreditRate', label: 'Credit Card Rewards (%)', value: 2, min: 0, max: 10, step: 0.25 },
            { id: 'pmCreditFee', label: 'Credit Card Annual Fee ($)', value: 0, min: 0, step: 5 },
            { id: 'pmCarried', label: 'Share of Balance Carried (%)', value: 0, min: 0, max: 100, step: 5, help: 'Portion of monthly spend not paid in full' },
            { id: 'pmApr', label: 'Credit Card APR (%)', value: 24, min: 0, max: 40, step: 0.5 },
            { id: 'pmDebitRate', label: 'Debit Card Rewards (%)', value: 0, min: 0, max: 10, step: 0.25, help: 'Most debit cards earn 0-1%' },
            { id: 'pmCashDiscount', label: 'Cash Discount Available (%)', value: 1, min: 0, max: 10, step: 0.25, help: 'Average discount merchants give for cash' },
            { id: 'pmCashShare', label: 'Purchases Offering Cash Discount (%)', value: 20, min: 0, max: 100, step: 5, help: 'Share of spending where a cash discount applies' }
        ],
        guide: `
            <h3>Cash vs Debit vs Credit</h3>
            <p>Compare the yearly value of paying with cash, debit, or a credit card based on your spending habits.</p>
            <h4>Things to Consider:</h4>
            <ul>
                <li><strong>Credit cards:</strong> Best value and fraud protection — only if you pay in full each month</li>
                <li><strong>Debit cards:</strong> No interest risk, but few rewards and weaker fraud protection</li>
                <li><strong>Cash:</strong> Some merchants offer discounts for cash, and it naturally limits overspending</li>
            </ul>
        `,
        calculate: function(i) {
            const annualSpend = i.pmSpend * 12;
            const interest = i.pmSpend * (i.pmCarried / 100) * (i.pmApr / 100);
            const creditValue = annualSpend * (i.pmCreditRate / 100) - i.pmCreditFee - interest;
            const debitValue = annualSpend * (i.pmDebitRate / 100);
            const cashValue = annualSpend * (i.pmCashShare / 100) * (i.pmCashDiscount / 100);
            const methods = [['Credit Card', creditValue], ['Debit Card', debitValue], ['Cash', cashValue]];
            const best = methods.reduce((a, b) => (b[1] > a[1] ? b : a));

            return {
                header: 'Annual Value by Payment Method',
                cards: [
                    { label: 'Credit Card', value: formatCurrency(creditValue), subtext: interest > 0 ? `After ${formatCurrency(interest)} interest` : 'Rewards minus fees', tone: creditValue >= 0 ? 'positive' : 'negative' },
                    { label: 'Debit Card', value: formatCurrency(debitValue), subtext: 'Rewards earned' },
                    { label: 'Cash', value: formatCurrency(cashValue), subtext: 'From cash discounts' },
                    { label: 'Best Option', value: best[0], subtext: `${formatCurrency(best[1])} per year`, tone: 'positive' }
                ],
                recommendation: {
                    title: `💡 Recommendation: ${best[0]}`,
                    paragraphs: [
                        `On ${formatCurrency(annualSpend)} of yearly spending, ${best[0].toLowerCase()} gives you the most value at ${formatCurrency(best[1])} per year.`,
                        interest > 0
                            ? `Carrying a balance costs you about ${formatCurrency(interest)} per year in interest, which erases credit card rewards. Pay in full to unlock the best value.`
                            : 'Since you pay your card in full, you get credit card rewards and purchase protection with no interest cost.'
                    ]
                }
            };
        }
    }
};

function buildCalculatorConfig(calculatorId) {
    const calc = AdditionalCalculators[calculatorId];
    const fields = calc.fields.map(f => {
        const help = f.help ? `<span class="form-help">${f.help}</span>` : '';
        const control = f.type === 'select'
            ? `<select class="form-select" id="${f.id}">${f.options.map(([value, label]) =>
                `<option value="${value}"${value === f.value ? ' selected' : ''}>${label}</option>`).join('')}</select>`
            : `<input type="number" class="form-input" id="${f.id}" value="${f.value}"` +
              `${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined ? ` max="${f.max}"` : ''} step="${f.step || 1}">`;
        return `
                    <div class="form-group">
                        <label class="form-label" for="${f.id}">${f.label}</label>
                        ${control}
                        ${help}
                    </div>`;
    }).join('');

    return {
        icon: calc.icon,
        title: calc.title,
        form: `
                <div class="form-grid">${fields}
                </div>
                <button class="btn btn-primary btn-large" onclick="calculateAdditional('${calculatorId}')" style="width: 100%; justify-content: center; margin-top: 1rem;">
                    ${calc.button}
                </button>
                <div id="resultsSection" class="results-section"></div>
            `,
        guide: calc.guide
    };
}

function calculateAdditional(calculatorId) {
    const calc = AdditionalCalculators[calculatorId];
    const inputs = {};
    let isValid = true;

    calc.fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (f.type === 'select') {
            inputs[f.id] = el.value;
        } else {
            inputs[f.id] = parseFloat(el.value);
            if (isNaN(inputs[f.id])) {
                el.classList.add('error');
                isValid = false;
            }
        }
    });

    if (!isValid) {
        showToast('Please fill in all fields with valid numbers', 'error');
        return;
    }

    const results = calc.calculate(inputs);
    if (results.error) {
        showToast(results.error, 'error');
        return;
    }

    const resultsSection = document.getElementById('resultsSection');
    resultsSection.innerHTML = `
        <div class="results-header">${results.header}</div>
        <div class="results-grid">
            ${results.cards.map(card => `
            <div class="result-card">
                <div class="result-label">${card.label}</div>
                <div class="result-value${card.tone ? ' ' + card.tone : ''}">${card.value}</div>
                <div class="result-subtext">${card.subtext}</div>
            </div>`).join('')}
        </div>
        <div class="recommendation-box">
            <h4>${results.recommendation.title}</h4>
            ${results.recommendation.paragraphs.filter(Boolean).map(p => `<p>${p}</p>`).join('')}
        </div>
    `;
    resultsSection.classList.add('active');

    if (Auth.isAuthenticated()) {
        saveCalculation(calculatorId, inputs, results);
    }

    trackEvent('Calculator', 'calculate', calc.title);

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

    // Open a calculator directly from a link such as /#debt-payoff
    const hashId = window.location.hash.slice(1);
    if (hashId && (hashId === 'buy-rent' || hashId === 'compound-interest' || AdditionalCalculators[hashId])) {
        openCalculator(hashId);
    }
    
    console.log('FinanceWise initialized successfully');
    console.log('© 2026 Ravi Kumar Peela');
});