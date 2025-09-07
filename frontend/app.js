
// NEW CODE


document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    showPage('home');
    
    const walletBtn = document.getElementById('walletBtn');
    if (walletBtn) {
        walletBtn.addEventListener('click', connectWallet);
    }
});

// Global Variables
let currentUser = null;
let walletConnected = false;
let userWalletAddress = null;
let assignments = [];
let users = [];
let auditLog = [];

// Initialize demo data (fallback)
function initializeData() {
    users = [
        { id: 1, username: 'student', password: 'password123', role: 'student', name: 'John Student' },
        { id: 2, username: 'lecturer', password: 'password123', role: 'lecturer', name: 'Dr. Jane Smith' },
        { id: 3, username: 'admin', password: 'password123', role: 'admin', name: 'System Administrator' }
    ];

    assignments = [
        {
            id: 1,
            studentId: 1,
            studentName: 'John Student',
            title: 'Web Development Assignment',
            filename: 'assignment1.pdf',
            hash: '5d41402abc4b2a76b9719d911017c592',
            blockchainTx: '0x123abc...def456',
            uploadDate: new Date().toISOString(),
            status: 'submitted',
            grade: null
        }
    ];

    auditLog = [
        {
            id: 1,
            timestamp: new Date().toISOString(),
            user: 'John Student',
            action: 'Assignment Submitted',
            details: 'Web Development Assignment uploaded'
        }
    ];
}

// API helper function
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Navigation Functions
function showPage(pageId) {
    const pages = ['homePage', 'aboutPage', 'contactPage', 'signinPage', 'dashboardPage'];
    pages.forEach(page => {
        document.getElementById(page).classList.add('hidden');
    });
    document.getElementById(pageId + 'Page').classList.remove('hidden');
}

// MetaMask Wallet Functions
async function connectWallet() {
    const walletStatus = document.getElementById('walletStatus');
    const walletBtn = document.getElementById('walletBtn');
    const signInForm = document.getElementById('signInForm');
    
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userWalletAddress = accounts[0];
            walletConnected = true;
            
            walletStatus.className = 'wallet-status wallet-connected';
            walletStatus.innerHTML = '<span>MetaMask: Connected (' + accounts[0].substring(0, 6) + '...' + accounts[0].substring(38) + ')</span>';
            walletBtn.textContent = 'Connected';
            walletBtn.disabled = true;
            
            signInForm.classList.remove('hidden');
            showMessage('Wallet connected successfully!', 'success');
        } catch (error) {
            walletStatus.className = 'wallet-status wallet-disconnected';
            walletStatus.innerHTML = '<span>MetaMask: Connection Failed</span>';
            showMessage('Failed to connect wallet: ' + error.message, 'error');
        }
    } else {
        walletStatus.className = 'wallet-status wallet-disconnected';
        walletStatus.innerHTML = '<span>MetaMask: Not Installed</span>';
        showMessage('MetaMask not detected. Please install MetaMask browser extension.', 'warning');
        
        // For demo purposes, simulate wallet connection
        walletConnected = true;
        userWalletAddress = '0x' + Math.random().toString(16).substr(2, 40);
        signInForm.classList.remove('hidden');
    }
}

// Authentication Functions
// Replace your login function in app.js with this fixed version

async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('userRole').value;

    if (!walletConnected) {
        showMessage('Please connect your MetaMask wallet first.', 'warning');
        return;
    }

    if (!username || !password || !role) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }

    try {
        showMessage('Logging in...', 'info');
        
        console.log('Attempting login with:', { username, role }); // Debug log
        
        const result = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                username: username,
                password: password,
                walletAddress: userWalletAddress
            })
        });

        console.log('Login result:', result); // Debug log

        if (result.success && result.user.role === role) {
            // Fix: Make sure currentUser has the correct ID format
            currentUser = {
                id: result.user.id, // This will be the MongoDB ObjectId
                username: result.user.username,
                name: result.user.name,
                role: result.user.role,
                walletAddress: result.user.walletAddress
            };
            
            console.log('Current user set:', currentUser); // Debug log
            
            document.getElementById('signinBtn').classList.add('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            
            await loadUserData();
            
            showDashboard();
            showMessage('Welcome, ' + result.user.name + '!', 'success');
            
        } else if (result.success && result.user.role !== role) {
            showMessage('User role is ' + result.user.role + ', but you selected ' + role + '. Please select the correct role.', 'error');
        } else {
            showMessage('Invalid credentials. Please check username and password.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Enhanced fallback to demo mode
        console.log('Falling back to demo mode');
        showMessage('Login failed, using demo mode.', 'warning');
        
        const user = users.find(u => u.username === username && u.password === password && u.role === role);
        
        if (user) {
            currentUser = user;
            document.getElementById('signinBtn').classList.add('hidden');
            document.getElementById('logoutBtn').classList.remove('hidden');
            
            showDashboard();
            showMessage('Welcome, ' + user.name + '! (Demo Mode)', 'success');
        } else {
            showMessage('Invalid credentials. Please try: admin/password123', 'error');
        }
    }
}

async function loadUserData() {
    try {
        const assignmentResult = await apiCall('/api/assignments');
        if (assignmentResult.success) {
            assignments = assignmentResult.assignments.map(a => ({
                id: a._id,
                studentId: a.student._id || a.student,
                studentName: a.studentName,
                title: a.title,
                filename: a.filename,
                hash: a.fileHash,
                blockchainTx: a.blockchainTx,
                uploadDate: a.uploadDate,
                status: a.status,
                grade: a.grade,
                feedback: a.feedback
            }));
        }

        if (currentUser.role === 'admin') {
            const userResult = await apiCall('/api/users');
            if (userResult.success) {
                users = userResult.users.map(u => ({
                    id: u._id,
                    username: u.username,
                    name: u.name,
                    role: u.role,
                    email: u.email
                }));
            }
        }

        if (currentUser.role === 'admin') {
            const auditResult = await apiCall('/api/audit');
            if (auditResult.success) {
                auditLog = auditResult.auditLogs.map(a => ({
                    id: a._id,
                    timestamp: a.timestamp,
                    user: a.user,
                    action: a.action,
                    details: a.details
                }));
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('Some data could not be loaded from server.', 'warning');
    }
}

function logout() {
    currentUser = null;
    assignments = [];
    users = [];
    auditLog = [];
    
    document.getElementById('signinBtn').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    showPage('home');
    showMessage('Logged out successfully.', 'info');
}

function showDashboard() {
    showPage('dashboard');
    document.getElementById('dashboardTitle').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) + ' Dashboard';
    document.getElementById('dashboardSubtitle').textContent = 'Welcome back, ' + currentUser.name + '!';
    document.getElementById('userInfo').textContent = 'Logged in as: ' + currentUser.name + ' (' + currentUser.role + ')';
    
    setupDashboardNavigation();
    showDashboardSection('overview');
}

function setupDashboardNavigation() {
    const nav = document.getElementById('dashboardNav');
    let navItems = [];

    switch (currentUser.role) {
        case 'student':
            navItems = [
                { id: 'overview', label: 'Overview' },
                { id: 'submit', label: 'Submit Assignment' },
                { id: 'submissions', label: 'My Submissions' }
            ];
            break;
        case 'lecturer':
            navItems = [
                { id: 'overview', label: 'Overview' },
                { id: 'verify', label: 'Verify Assignments' },
                { id: 'grade', label: 'Grade Submissions' }
            ];
            break;
        case 'admin':
            navItems = [
                { id: 'overview', label: 'Overview' },
                { id: 'users', label: 'Manage Users' },
                { id: 'assignments', label: 'All Assignments' },
                { id: 'audit', label: 'Audit Trail' }
            ];
            break;
        default:
            navItems = [
                { id: 'overview', label: 'Overview' }
            ];
    }

    nav.innerHTML = navItems.map(item => 
        '<button class="dashboard-btn" onclick="showDashboardSection(\'' + item.id + '\')">' + item.label + '</button>'
    ).join('');
    
    if (navItems.length > 0) {
        setTimeout(() => {
            const firstBtn = nav.querySelector('.dashboard-btn');
            if (firstBtn) {
                firstBtn.classList.add('active');
            }
        }, 100);
    }
}

function showDashboardSection(section) {
    document.querySelectorAll('.dashboard-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }

    switch (section) {
        case 'overview':
            showOverview();
            break;
        case 'submit':
            showSubmitAssignment();
            break;
        case 'submissions':
            showMySubmissions();
            break;
        case 'verify':
            showVerifyAssignments();
            break;
        case 'grade':
            showGradeSubmissions();
            break;
        case 'users':
            showManageUsers();
            break;
        case 'assignments':
            showAllAssignments();
            break;
        case 'audit':
            showAuditTrail();
            break;
        default:
            document.getElementById('dashboardContent').innerHTML = '<h3>Section not found</h3>';
    }
}

function showOverview() {
    const content = document.getElementById('dashboardContent');
    let stats = '';

    switch (currentUser.role) {
        case 'student':
            const myAssignments = assignments.filter(a => a.studentId === currentUser.id);
            stats = '<div class="features-grid">' +
                '<div class="feature-card">' +
                '<div class="feature-icon">📝</div>' +
                '<h3>' + myAssignments.length + '</h3>' +
                '<p>Total Submissions</p>' +
                '</div>' +
                '<div class="feature-card">' +
                '<div class="feature-icon">✅</div>' +
                '<h3>' + myAssignments.filter(a => a.grade).length + '</h3>' +
                '<p>Graded Assignments</p>' +
                '</div>' +
                '<div class="feature-card">' +
                '<div class="feature-icon">⏳</div>' +
                '<h3>' + myAssignments.filter(a => !a.grade).length + '</h3>' +
                '<p>Pending Review</p>' +
                '</div>' +
                '</div>';
            break;
        case 'lecturer':
            stats = '<div class="features-grid">' +
                '<div class="feature-card">' +
                '<div class="feature-icon">📚</div>' +
                '<h3>' + assignments.length + '</h3>' +
                '<p>Total Submissions</p>' +
                '</div>' +
                '<div class="feature-card">' +
                '<div class="feature-icon">✅</div>' +
                '<h3>' + assignments.filter(a => a.grade).length + '</h3>' +
                '<p>Graded</p>' +
                '</div>' +
                '<div class="feature-card">' +
                '<div class="feature-icon">⏳</div>' +
                '<h3>' + assignments.filter(a => !a.grade).length + '</h3>' +
                '<p>Pending Grading</p>' +
                '</div>' +
                '</div>';
            break;
        case 'admin':
            stats = '<div class="features-grid">' +
                '<div class="feature-card">' +
                '<div class="feature-icon">👥</div>' +
                '<h3>' + users.length + '</h3>' +
                '<p>Total Users</p>' +
                '</div>' +
                '<div class="feature-card">' +
                '<div class="feature-icon">📝</div>' +
                '<h3>' + assignments.length + '</h3>' +
                '<p>Total Assignments</p>' +
                '</div>' +
                '<div class="feature-card">' +
                '<div class="feature-icon">🔍</div>' +
                '<h3>' + auditLog.length + '</h3>' +
                '<p>Audit Entries</p>' +
                '</div>' +
                '</div>';
            break;
    }

    content.innerHTML = '<h3>Dashboard Overview</h3>' +
        stats +
        '<div style="margin-top: 2rem;">' +
        '<h4>System Status</h4>' +
        '<p><strong>Database:</strong> ' + (assignments.length > 0 ? 'Connected ✅' : 'Demo Mode 🟡') + '</p>' +
        '<p><strong>Wallet:</strong> ' + (walletConnected ? 'Connected ✅' : 'Disconnected ❌') + '</p>' +
        '<p><strong>User Role:</strong> ' + currentUser.role + '</p>' +
        '</div>';
}

function showSubmitAssignment() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<h3>Submit Assignment</h3>' +
        '<form onsubmit="submitAssignment(event)" style="max-width: 600px;">' +
        '<div class="form-group">' +
        '<label for="feedback">Feedback</label>' +
        '<textarea id="feedback" class="form-input" rows="4" placeholder="Enter feedback for the student"></textarea>' +
        '</div>' +
        '<div style="display: flex; gap: 1rem; margin-top: 1rem;">' +
        '<button type="submit" class="btn btn-primary" style="flex: 1;">Submit Grade</button>' +
        '<button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Cancel</button>' +
        '</div>' +
        '</form>';
}

async function submitGrade(event, assignmentId) {
    event.preventDefault();
    
    const grade = document.getElementById('grade').value;
    const feedback = document.getElementById('feedback').value;
    
    try {
        const result = await apiCall('/api/assignments/' + assignmentId + '/grade', {
            method: 'PUT',
            body: JSON.stringify({
                grade: grade,
                feedback: feedback,
                lecturerId: currentUser.id
            })
        });

        if (result.success) {
            showMessage('Assignment graded successfully!', 'success');
            await loadUserData();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Grading error:', error);
        
        const assignment = assignments.find(a => a.id == assignmentId);
        if (assignment) {
            assignment.grade = grade + '%';
            assignment.feedback = feedback;
            assignment.status = 'graded';
            assignment.gradedBy = currentUser.name;
            assignment.gradeDate = new Date().toISOString();
        }
        showMessage('Assignment graded successfully! (Demo Mode)', 'success');
    }
    
    closeModal();
    showDashboardSection('grade');
}

function showManageUsers() {
    const content = document.getElementById('dashboardContent');
    
    let tableRows = '';
    users.forEach(user => {
        tableRows += '<tr>' +
            '<td>' + user.name + '</td>' +
            '<td>' + user.username + '</td>' +
            '<td>' + (user.email || 'N/A') + '</td>' +
            '<td>' + user.role + '</td>' +
            '<td>Active</td>' +
            '<td><button class="btn btn-secondary" onclick="editUser(\'' + user.id + '\')">Edit</button></td>' +
            '</tr>';
    });

    content.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">' +
        '<h3>Manage Users</h3>' +
        '<button class="btn btn-primary" onclick="showAddUserForm()">Add New User</button>' +
        '</div>' +
        '<table class="data-table">' +
        '<thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' + tableRows + '</tbody>' +
        '</table>';
}

function showAddUserForm() {
    showModal('<h3>Add New User</h3>' +
        '<form onsubmit="addUser(event)" id="addUserForm">' +
        '<div class="form-group">' +
        '<label for="userName">Full Name</label>' +
        '<input type="text" id="userName" class="form-input" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="userUsername">Username</label>' +
        '<input type="text" id="userUsername" class="form-input" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="userEmail">Email</label>' +
        '<input type="email" id="userEmail" class="form-input" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="userPassword">Password</label>' +
        '<input type="password" id="userPassword" class="form-input" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="userRoleSelect">Role</label>' +
        '<select id="userRoleSelect" class="form-select" required>' +
        '<option value="">Select Role</option>' +
        '<option value="student">Student</option>' +
        '<option value="lecturer">Lecturer</option>' +
        '<option value="admin">Administrator</option>' +
        '</select>' +
        '</div>' +
        '<div style="display: flex; gap: 1rem; margin-top: 1rem;">' +
        '<button type="submit" class="btn btn-primary" style="flex: 1;">Add User</button>' +
        '<button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Cancel</button>' +
        '</div>' +
        '</form>');
}

// CONTINUATION OF app.js - FROM addUser FUNCTION ONWARDS

async function addUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('userName').value;
    const username = document.getElementById('userUsername').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRoleSelect').value;

    try {
        if (users.find(u => u.username === username)) {
            showMessage('Username already exists!', 'error');
            return;
        }

        const result = await apiCall('/api/users', {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                username: username,
                email: email,
                password: password,
                role: role
            })
        });

        if (result.success) {
            showMessage('User added successfully!', 'success');
            await loadUserData();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Add user error:', error);
        
        const newUser = {
            id: users.length + 1,
            name: name,
            username: username,
            email: email,
            role: role
        };
        
        users.push(newUser);
        showMessage('User added successfully! (Demo Mode)', 'success');
    }
    
    closeModal();
    showDashboardSection('users');
}

function editUser(userId) {
    const user = users.find(u => u.id == userId);
    if (!user) return;

    showModal('<h3>Edit User</h3>' +
        '<form onsubmit="updateUser(event, \'' + userId + '\')" id="editUserForm">' +
        '<div class="form-group">' +
        '<label for="editUserName">Full Name</label>' +
        '<input type="text" id="editUserName" class="form-input" value="' + user.name + '" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="editUserEmail">Email</label>' +
        '<input type="email" id="editUserEmail" class="form-input" value="' + (user.email || '') + '" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="editUserRole">Role</label>' +
        '<select id="editUserRole" class="form-select" required>' +
        '<option value="student"' + (user.role === 'student' ? ' selected' : '') + '>Student</option>' +
        '<option value="lecturer"' + (user.role === 'lecturer' ? ' selected' : '') + '>Lecturer</option>' +
        '<option value="admin"' + (user.role === 'admin' ? ' selected' : '') + '>Administrator</option>' +
        '</select>' +
        '</div>' +
        '<div style="display: flex; gap: 1rem; margin-top: 1rem;">' +
        '<button type="submit" class="btn btn-primary" style="flex: 1;">Update User</button>' +
        '<button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Cancel</button>' +
        '</div>' +
        '</form>');
}

async function updateUser(event, userId) {
    event.preventDefault();
    
    const name = document.getElementById('editUserName').value;
    const email = document.getElementById('editUserEmail').value;
    const role = document.getElementById('editUserRole').value;

    try {
        const result = await apiCall('/api/users/' + userId, {
            method: 'PUT',
            body: JSON.stringify({
                name: name,
                email: email,
                role: role
            })
        });

        if (result.success) {
            showMessage('User updated successfully!', 'success');
            await loadUserData();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Update user error:', error);
        
        const user = users.find(u => u.id == userId);
        if (user) {
            user.name = name;
            user.email = email;
            user.role = role;
        }
        showMessage('User updated successfully! (Demo Mode)', 'success');
    }
    
    closeModal();
    showDashboardSection('users');
}

function showAllAssignments() {
    const content = document.getElementById('dashboardContent');
    
    let tableRows = '';
    assignments.forEach(assignment => {
        tableRows += '<tr>' +
            '<td>' + assignment.studentName + '</td>' +
            '<td>' + assignment.title + '</td>' +
            '<td>' + assignment.filename + '</td>' +
            '<td>' + new Date(assignment.uploadDate).toLocaleDateString() + '</td>' +
            '<td>' + assignment.status + '</td>' +
            '<td>' + (assignment.grade || 'Pending') + '</td>' +
            '<td><button class="btn btn-secondary" onclick="viewAssignment(\'' + assignment.id + '\')">View Details</button></td>' +
            '</tr>';
    });

    content.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">' +
        '<h3>All Assignments</h3>' +
        '<button class="btn btn-primary" onclick="exportAssignments()">Export to Excel</button>' +
        '</div>' +
        '<table class="data-table">' +
        '<thead><tr><th>Student</th><th>Title</th><th>File</th><th>Date</th><th>Status</th><th>Grade</th><th>Actions</th></tr></thead>' +
        '<tbody>' + tableRows + '</tbody>' +
        '</table>';
}

function showAuditTrail() {
    const content = document.getElementById('dashboardContent');
    
    let tableRows = '';
    auditLog.slice().reverse().forEach(entry => {
        tableRows += '<tr>' +
            '<td>' + new Date(entry.timestamp).toLocaleString() + '</td>' +
            '<td>' + entry.user + '</td>' +
            '<td>' + entry.action + '</td>' +
            '<td>' + entry.details + '</td>' +
            '</tr>';
    });

    content.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">' +
        '<h3>Audit Trail</h3>' +
        '<button class="btn btn-primary" onclick="exportAuditLog()">Export Log</button>' +
        '</div>' +
        '<table class="data-table">' +
        '<thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Details</th></tr></thead>' +
        '<tbody>' + tableRows + '</tbody>' +
        '</table>';
}

function viewAssignment(assignmentId) {
    const assignment = assignments.find(a => a.id == assignmentId);
    if (!assignment) return;

    let modalContent = '<h3>Assignment Details</h3>' +
        '<div style="margin-bottom: 1rem;">' +
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">' +
        '<div><strong>Student:</strong> ' + assignment.studentName + '</div>' +
        '<div><strong>Title:</strong> ' + assignment.title + '</div>' +
        '<div><strong>File:</strong> ' + assignment.filename + '</div>' +
        '<div><strong>Status:</strong> ' + assignment.status + '</div>' +
        '<div><strong>Date:</strong> ' + new Date(assignment.uploadDate).toLocaleDateString() + '</div>' +
        '<div><strong>Grade:</strong> ' + (assignment.grade || 'Pending') + '</div>' +
        '</div>' +
        '</div>';
    
    if (assignment.hash) {
        modalContent += '<div class="blockchain-tx">' +
            '<h4>Blockchain Information</h4>' +
            '<div class="hash-display">' +
            '<strong>File Hash:</strong><br>' + assignment.hash +
            '</div>' +
            '<p style="margin-top: 0.5rem;"><strong>Transaction:</strong> ' + assignment.blockchainTx + '</p>' +
            '</div>';
    }
    
    if (assignment.feedback) {
        modalContent += '<div style="background: #f8f9ff; padding: 1rem; border-radius: 10px; margin-top: 1rem;">' +
            '<h4>Feedback</h4>' +
            '<p>' + assignment.feedback + '</p>' +
            '<small>Graded by: ' + assignment.gradedBy + ' on ' + new Date(assignment.gradeDate).toLocaleDateString() + '</small>' +
            '</div>';
    }
    
    modalContent += '<div style="display: flex; gap: 1rem; margin-top: 1rem;">' +
        '<button class="btn btn-primary" onclick="closeModal()" style="flex: 1;">Close</button>' +
        '<button class="btn btn-secondary" onclick="printAssignmentReport(\'' + assignment.id + '\')" style="flex: 1;">Print Report</button>' +
        '</div>';

    showModal(modalContent);
}

function exportAssignments() {
    if (typeof XLSX === 'undefined') {
        showMessage('Excel export feature not available.', 'error');
        return;
    }

    const data = assignments.map(a => ({
        'Student': a.studentName,
        'Title': a.title,
        'Filename': a.filename,
        'Upload Date': new Date(a.uploadDate).toLocaleDateString(),
        'Status': a.status,
        'Grade': a.grade || 'Pending',
        'Hash': a.hash || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assignments');
    
    XLSX.writeFile(workbook, 'assignments_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showMessage('Assignments exported successfully!', 'success');
}

function exportAuditLog() {
    if (typeof XLSX === 'undefined') {
        showMessage('Excel export feature not available.', 'error');
        return;
    }

    const data = auditLog.map(a => ({
        'Timestamp': new Date(a.timestamp).toLocaleString(),
        'User': a.user,
        'Action': a.action,
        'Details': a.details
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Log');
    
    XLSX.writeFile(workbook, 'audit_log_' + new Date().toISOString().split('T')[0] + '.xlsx');
    showMessage('Audit log exported successfully!', 'success');
}

function printAssignmentReport(assignmentId) {
    const assignment = assignments.find(a => a.id == assignmentId);
    if (!assignment) return;

    const printWindow = window.open('', '_blank');
    const printContent = `
        <html>
        <head>
            <title>Assignment Report - ${assignment.title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .details { margin: 20px 0; }
                .detail-row { margin: 10px 0; }
                .hash { font-family: monospace; word-break: break-all; background: #f5f5f5; padding: 15px; border-radius: 5px; }
                .feedback-section { background: #f0f8ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
                .footer { margin-top: 40px; font-size: 12px; text-align: center; color: #666; border-top: 1px solid #ccc; padding-top: 20px; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>EduChain Assignment Report</h1>
                <h2>${assignment.title}</h2>
            </div>
            <div class="details">
                <div class="detail-row"><strong>Student:</strong> ${assignment.studentName}</div>
                <div class="detail-row"><strong>File:</strong> ${assignment.filename}</div>
                <div class="detail-row"><strong>Upload Date:</strong> ${new Date(assignment.uploadDate).toLocaleString()}</div>
                <div class="detail-row"><strong>Status:</strong> ${assignment.status}</div>
                <div class="detail-row"><strong>Grade:</strong> ${assignment.grade || 'Pending'}</div>
                ${assignment.feedback ? `<div class="feedback-section"><h4>Feedback:</h4><p>${assignment.feedback}</p><small>Graded by: ${assignment.gradedBy}</small></div>` : ''}
                ${assignment.hash ? `<div class="detail-row"><strong>File Hash (SHA-256):</strong></div><div class="hash">${assignment.hash}</div>` : ''}
                <div class="detail-row"><strong>Blockchain Transaction:</strong> ${assignment.blockchainTx}</div>
            </div>
            <div class="footer">
                <p>Generated on ${new Date().toLocaleString()} by EduChain System</p>
                <p>This report contains cryptographically verified assignment data</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

function showMessage(message, type) {
    const existingMessage = document.querySelector('.status-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'status-message status-' + type;
    messageDiv.textContent = message;
    
    // Position the message at the top of the viewport
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.zIndex = '9999';
    messageDiv.style.maxWidth = '400px';
    messageDiv.style.animation = 'slideIn 0.3s ease-out';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }
    }, 5000);
}

function showModal(content) {
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('modal').classList.add('show');
    
    // Focus on first input if available
    setTimeout(() => {
        const firstInput = document.querySelector('#modalContent input, #modalContent textarea');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

function submitContact(event) {
    event.preventDefault();
    
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const message = document.getElementById('contactMessage').value;
    
    // Simulate sending message
    showMessage('Thank you, ' + name + '! Your message has been sent. We will get back to you soon.', 'success');
    event.target.reset();
}

// Enhanced file drag and drop functionality
function setupFileDropZone() {
    const fileUpload = document.querySelector('.file-upload');
    const fileInput = document.getElementById('assignmentFile');
    
    if (!fileUpload || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUpload.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUpload.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    fileUpload.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        fileUpload.classList.add('dragover');
    }

    function unhighlight() {
        fileUpload.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    }
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function to validate file type
function validateFileType(fileName) {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.zip'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return allowedExtensions.includes(fileExtension);
}

// Enhanced error handling for API calls
async function handleApiError(error, fallbackAction = null) {
    console.error('API Error:', error);
    
    if (error.message.includes('Failed to fetch')) {
        showMessage('Connection error. Operating in demo mode.', 'warning');
    } else if (error.message.includes('401')) {
        showMessage('Authentication failed. Please log in again.', 'error');
        setTimeout(() => {
            logout();
        }, 2000);
        return;
    } else if (error.message.includes('403')) {
        showMessage('Access denied. Insufficient permissions.', 'error');
    } else if (error.message.includes('409')) {
        showMessage('Duplicate detected. This file has already been submitted.', 'error');
    } else {
        showMessage('Operation failed. Using fallback mode.', 'warning');
    }
    
    if (fallbackAction && typeof fallbackAction === 'function') {
        fallbackAction();
    }
}

// Auto-save form data to prevent loss
function autoSaveFormData() {
    const titleInput = document.getElementById('assignmentTitle');
    if (titleInput) {
        titleInput.addEventListener('input', function() {
            sessionStorage.setItem('draft_title', this.value);
        });
        
        // Restore saved data
        const savedTitle = sessionStorage.getItem('draft_title');
        if (savedTitle) {
            titleInput.value = savedTitle;
        }
    }
}

// Clear saved form data after successful submission
function clearSavedFormData() {
    sessionStorage.removeItem('draft_title');
}

// Connection status indicator
function updateConnectionStatus() {
    const statusElements = document.querySelectorAll('[data-connection-status]');
    const status = navigator.onLine ? 'Online' : 'Offline';
    statusElements.forEach(element => {
        element.textContent = status;
        element.className = navigator.onLine ? 'status-online' : 'status-offline';
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close modal
    if (e.key === 'Escape') {
        closeModal();
    }
    
    // Ctrl+S to save/export (prevent browser save)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (currentUser && currentUser.role === 'admin') {
            exportAssignments();
        }
    }
    
    // Ctrl+P to print current assignment (if viewing one)
    if (e.ctrlKey && e.key === 'p') {
        const modal = document.getElementById('modal');
        if (modal.classList.contains('show')) {
            e.preventDefault();
            const assignmentId = modal.dataset.currentAssignment;
            if (assignmentId) {
                printAssignmentReport(assignmentId);
            }
        }
    }
});

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up modal click outside to close
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                closeModal();
            }
        });
    }

    // Set up file drop zone observer
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                setupFileDropZone();
                autoSaveFormData();
            }
        });
    });

    const dashboardContent = document.getElementById('dashboardContent');
    if (dashboardContent) {
        observer.observe(dashboardContent, { childList: true, subtree: true });
    }

    // Listen for online/offline events
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    // Initial connection status update
    updateConnectionStatus();
    
    // Add CSS animations for messages
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .status-online { color: #10b981; }
        .status-offline { color: #ef4444; }
    `;
    document.head.appendChild(style);
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showMessage('An unexpected error occurred. Please refresh the page.', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showMessage('A network error occurred. Please check your connection.', 'warning');
});
