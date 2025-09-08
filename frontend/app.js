// EduChain Assignment Management System - Fixed app.js

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
        
        console.log('Attempting login with:', { username, role });
        
        const result = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                username: username,
                password: password,
                walletAddress: userWalletAddress
            })
        });

        console.log('Login result:', result);

        if (result.success && result.user.role === role) {
            currentUser = {
                id: result.user.id,
                username: result.user.username,
                name: result.user.name,
                role: result.user.role,
                walletAddress: result.user.walletAddress
            };
            
            console.log('Current user set:', currentUser);
            
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

// Replace the loadUserData function in your app.js with this fixed version

async function loadUserData() {
    try {
        const assignmentResult = await apiCall('/api/assignments');
        if (assignmentResult.success && assignmentResult.assignments) {
            assignments = assignmentResult.assignments.map(a => ({
                // Use _id if it exists, otherwise use id, otherwise generate one
                id: a._id || a.id || Date.now() + Math.random(),
                studentId: a.student?._id || a.student || a.studentId,
                studentName: a.studentName || (a.student ? a.student.name : 'Unknown Student'),
                title: a.title || 'Untitled Assignment',
                filename: a.filename || a.fileName || a.originalName,
                hash: a.fileHash || a.hash,
                blockchainTx: a.blockchainTx,
                uploadDate: a.uploadDate || a.submittedAt,
                status: a.status || 'submitted',
                grade: a.grade,
                feedback: a.feedback,
                courseCode: a.courseCode,
                description: a.description,
                dueDate: a.dueDate,
                gradedBy: a.gradedBy,
                gradedAt: a.gradedAt
            }));
            console.log('Assignments loaded:', assignments.length);
        } else {
            console.log('No assignments returned from API');
            assignments = [];
        }

        if (currentUser.role === 'admin') {
            const userResult = await apiCall('/api/users');
            if (userResult.success && userResult.users) {
                users = userResult.users.map(u => ({
                    id: u._id || u.id,
                    username: u.username,
                    name: u.name,
                    role: u.role,
                    email: u.email
                }));
                console.log('Users loaded:', users.length);
            }
        }

        if (currentUser.role === 'admin') {
            try {
                const auditResult = await apiCall('/api/audit');
                if (auditResult.success && auditResult.auditLogs) {
                    auditLog = auditResult.auditLogs.map(a => ({
                        id: a._id || a.id,
                        timestamp: a.timestamp,
                        user: a.user,
                        action: a.action,
                        details: a.details
                    }));
                    console.log('Audit logs loaded:', auditLog.length);
                }
            } catch (auditError) {
                console.log('Audit logs not available:', auditError.message);
                auditLog = [];
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('Some data could not be loaded from server.', 'warning');
        
        // Initialize with empty arrays to prevent further errors
        assignments = assignments || [];
        users = users || [];
        auditLog = auditLog || [];
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

// Dashboard Functions
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

// Overview Function
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

// Student Functions
function showSubmitAssignment() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <h3>Submit Assignment</h3>
        <form id="assignmentForm" enctype="multipart/form-data">
            <div class="form-group">
                <label for="assignmentTitle">Assignment Title:</label>
                <input type="text" id="assignmentTitle" name="title" required>
            </div>
            
            <div class="form-group">
                <label for="courseCode">Course Code:</label>
                <input type="text" id="courseCode" name="courseCode" required placeholder="e.g., CS101">
            </div>
            
            <div class="form-group">
                <label for="description">Description:</label>
                <textarea id="description" name="description" rows="4" placeholder="Brief description of your assignment"></textarea>
            </div>
            
            <div class="form-group">
                <label for="assignmentFile">Upload Assignment File:</label>
                <input type="file" id="assignmentFile" name="assignmentFile" accept=".pdf,.doc,.docx,.txt,.zip" required>
                <small>Supported formats: PDF, DOC, DOCX, TXT, ZIP</small>
            </div>
            
            <div class="form-group">
                <label for="dueDate">Due Date:</label>
                <input type="datetime-local" id="dueDate" name="dueDate" required>
            </div>
            
            <button type="submit" class="btn btn-primary">Submit Assignment</button>
            <button type="button" class="btn btn-secondary" onclick="showDashboardSection('overview')">Cancel</button>
        </form>
    `;
    
    document.getElementById('assignmentForm').addEventListener('submit', handleAssignmentSubmission);
}

async function handleAssignmentSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const form = e.target;
    
    formData.append('title', form.title.value);
    formData.append('courseCode', form.courseCode.value);
    formData.append('description', form.description.value);
    formData.append('dueDate', form.dueDate.value);
    formData.append('assignmentFile', form.assignmentFile.files[0]);
    formData.append('studentId', currentUser.id);
    formData.append('studentName', currentUser.name);
    
    try {
        const response = await fetch('/api/assignments/submit', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Assignment submitted successfully!', 'success');
            showDashboardSection('submissions');
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Submission error:', error);
        showMessage('Failed to submit assignment. Please try again.', 'error');
    }
}

async function showMySubmissions() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="loading">Loading your submissions...</div>';
    
    try {
        const response = await fetch(`/api/assignments/student/${currentUser.id}`);
        const result = await response.json();
        
        if (result.success) {
            displaySubmissions(result.submissions);
        } else {
            content.innerHTML = `<div class="error">Error loading submissions: ${result.error}</div>`;
        }
    } catch (error) {
        console.error('Error fetching submissions:', error);
        displaySubmissions([]);
    }
}

function displaySubmissions(submissions) {
    const content = document.getElementById('dashboardContent');
    
    if (submissions.length === 0) {
        content.innerHTML = `
            <h3>My Submissions</h3>
            <div class="no-submissions">
                <p>You haven't submitted any assignments yet.</p>
                <button class="btn btn-primary" onclick="showDashboardSection('submit')">Submit Your First Assignment</button>
            </div>
        `;
        return;
    }
    
    let submissionsHTML = `
        <h3>My Submissions</h3>
        <div class="submissions-grid">
    `;
    
    submissions.forEach(submission => {
        const statusClass = getStatusClass(submission.status);
        const submissionDate = new Date(submission.submittedAt).toLocaleDateString();
        const dueDate = new Date(submission.dueDate).toLocaleDateString();
        
        submissionsHTML += `
            <div class="submission-card">
                <div class="submission-header">
                    <h4>${submission.title}</h4>
                    <span class="status ${statusClass}">${submission.status}</span>
                </div>
                <div class="submission-details">
                    <p><strong>Course:</strong> ${submission.courseCode}</p>
                    <p><strong>Submitted:</strong> ${submissionDate}</p>
                    <p><strong>Due Date:</strong> ${dueDate}</p>
                    ${submission.grade ? `<p><strong>Grade:</strong> ${submission.grade}</p>` : ''}
                    ${submission.feedback ? `<p><strong>Feedback:</strong> ${submission.feedback}</p>` : ''}
                </div>
                <div class="submission-actions">
                    <button class="btn btn-sm" onclick="viewSubmission('${submission._id}')">View Details</button>
                    ${submission.fileName ? `<button class="btn btn-sm" onclick="downloadFile('${submission._id}')">Download</button>` : ''}
                </div>
            </div>
        `;
    });
    
    submissionsHTML += `
        </div>
        <button class="btn btn-primary" onclick="showDashboardSection('submit')">Submit New Assignment</button>
    `;
    
    content.innerHTML = submissionsHTML;
}

// Lecturer Functions
async function showVerifyAssignments() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="loading">Loading assignments...</div>';
    
    try {
        const response = await fetch('/api/assignments/all');
        const result = await response.json();
        
        if (result.success) {
            displayLecturerAssignments(result.assignments, 'verify');
        } else {
            content.innerHTML = `<div class="error">Error loading assignments: ${result.error}</div>`;
        }
    } catch (error) {
        console.error('Error fetching assignments:', error);
        displayLecturerAssignments(assignments, 'verify');
    }
}

async function showGradeSubmissions() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="loading">Loading submissions...</div>';
    
    try {
        const response = await fetch('/api/assignments/all');
        const result = await response.json();
        
        if (result.success) {
            displayLecturerAssignments(result.assignments, 'grade');
        } else {
            content.innerHTML = `<div class="error">Error loading submissions: ${result.error}</div>`;
        }
    } catch (error) {
        console.error('Error fetching submissions:', error);
        displayLecturerAssignments(assignments, 'grade');
    }
}

function displayLecturerAssignments(assignments, mode) {
    const content = document.getElementById('dashboardContent');
    
    if (assignments.length === 0) {
        content.innerHTML = `
            <h3>${mode === 'verify' ? 'Verify Assignments' : 'Grade Submissions'}</h3>
            <div class="no-assignments">
                <p>No assignments available.</p>
            </div>
        `;
        return;
    }
    
    let filteredAssignments = assignments;
    if (mode === 'grade') {
        filteredAssignments = assignments.filter(a => 
            a.status === 'submitted' || a.status === 'late'
        );
    }
    
    let assignmentsHTML = `
        <h3>${mode === 'verify' ? 'Verify Assignments' : 'Grade Submissions'}</h3>
        <div class="lecturer-controls">
            <div class="filter-controls">
                <select id="statusFilter" onchange="filterAssignments('${mode}')">
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="late">Late</option>
                    <option value="graded">Graded</option>
                    <option value="pending">Pending</option>
                </select>
                <select id="courseFilter" onchange="filterAssignments('${mode}')">
                    <option value="all">All Courses</option>
                    ${[...new Set(assignments.map(a => a.courseCode || 'Unknown'))].map(course => 
                        `<option value="${course}">${course}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="view-controls">
                <button class="btn btn-secondary" onclick="exportAssignments()">Export CSV</button>
            </div>
        </div>
        <div class="assignments-table">
            <table>
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Assignment</th>
                        <th>Course</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Grade</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="assignmentsTableBody">
    `;
    
    filteredAssignments.forEach(assignment => {
        const statusClass = getStatusClass(assignment.status);
        const submittedDate = new Date(assignment.submittedAt || assignment.uploadDate).toLocaleDateString();
        
        assignmentsHTML += `
            <tr data-status="${assignment.status}" data-course="${assignment.courseCode || 'Unknown'}">
                <td>
                    <div class="student-info">
                        <strong>${assignment.studentName}</strong>
                        <small>ID: ${assignment.studentId}</small>
                    </div>
                </td>
                <td>
                    <div class="assignment-info">
                        <strong>${assignment.title}</strong>
                        ${assignment.description ? `<small>${assignment.description.substring(0, 50)}...</small>` : ''}
                    </div>
                </td>
                <td><span class="course-badge">${assignment.courseCode || 'Unknown'}</span></td>
                <td>${submittedDate}</td>
                <td><span class="status ${statusClass}">${assignment.status}</span></td>
                <td>
                    ${assignment.grade ? 
                        `<span class="grade-display">${assignment.grade}</span>` : 
                        '<span class="no-grade">Not graded</span>'
                    }
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="viewAssignmentDetails('${assignment._id || assignment.id}')">View</button>
                        ${mode === 'grade' && !assignment.grade ? 
                            `<button class="btn btn-sm btn-success" onclick="gradeAssignment('${assignment._id || assignment.id}')">Grade</button>` : 
                            assignment.grade ? `<button class="btn btn-sm btn-warning" onclick="editGrade('${assignment._id || assignment.id}')">Edit Grade</button>` : ''
                        }
                    </div>
                </td>
            </tr>
        `;
    });
    
    assignmentsHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    content.innerHTML = assignmentsHTML;
}

function filterAssignments(mode) {
    const statusFilter = document.getElementById('statusFilter').value;
    const courseFilter = document.getElementById('courseFilter').value;
    const rows = document.querySelectorAll('#assignmentsTableBody tr');
    
    rows.forEach(row => {
        const status = row.getAttribute('data-status');
        const course = row.getAttribute('data-course');
        
        const statusMatch = statusFilter === 'all' || status === statusFilter;
        const courseMatch = courseFilter === 'all' || course === courseFilter;
        
        if (statusMatch && courseMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function viewAssignmentDetails(assignmentId) {
    try {
        const response = await fetch(`/api/assignments/submission/${assignmentId}`);
        const result = await response.json();
        
        if (result.success) {
            displayAssignmentDetails(result.submission, true);
        } else {
            showMessage('Error loading assignment details: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error fetching assignment details:', error);
        const assignment = assignments.find(a => a.id == assignmentId);
        if (assignment) {
            displayAssignmentDetails(assignment, true);
        } else {
            showMessage('Failed to load assignment details.', 'error');
        }
    }
}

function displayAssignmentDetails(assignment, isLecturerView = false) {
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
        <h3>Assignment Details</h3>
        <div class="assignment-detail-card">
            <div class="detail-header">
                <h4>${assignment.title}</h4>
                <span class="status ${getStatusClass(assignment.status)}">${assignment.status}</span>
            </div>
            
            <div class="detail-grid">
                <div class="detail-section">
                    <h4>Student Information</h4>
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${assignment.studentName}</span>
                    </div>
                    <div class="detail-item">
                        <label>Student ID:</label>
                        <span>${assignment.studentId}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Assignment Information</h4>
                    <div class="detail-item">
                        <label>Course Code:</label>
                        <span class="course-badge">${assignment.courseCode || 'Unknown'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Submitted:</label>
                        <span>${new Date(assignment.submittedAt || assignment.uploadDate).toLocaleString()}</span>
                    </div>
                    ${assignment.description ? `
                    <div class="detail-item full-width">
                        <label>Description:</label>
                        <p class="description">${assignment.description}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            
           // App.js Continuation - From grading section to end

            ${assignment.grade || assignment.feedback ? `
            <div class="grading-section">
                <h4>Grading Information</h4>
                ${assignment.grade ? `
                <div class="detail-item">
                    <label>Grade:</label>
                    <span class="grade-display">${assignment.grade}</span>
                </div>
                ` : ''}
                ${assignment.feedback ? `
                <div class="detail-item full-width">
                    <label>Feedback:</label>
                    <p class="feedback">${assignment.feedback}</p>
                </div>
                ` : ''}
                ${assignment.gradedBy ? `
                <div class="detail-item">
                    <label>Graded by:</label>
                    <span>${assignment.gradedBy}</span>
                </div>
                ` : ''}
                ${assignment.gradedAt ? `
                <div class="detail-item">
                    <label>Graded on:</label>
                    <span>${new Date(assignment.gradedAt).toLocaleString()}</span>
                </div>
                ` : ''}
            </div>
            ` : ''}
            
            <div class="actions">
                ${assignment.fileName ? `<button class="btn btn-primary" onclick="downloadFile('${assignment._id || assignment.id}')">Download Submission</button>` : ''}
                ${isLecturerView ? `
                    ${!assignment.grade ? 
                        `<button class="btn btn-success" onclick="gradeAssignment('${assignment._id || assignment.id}')">Grade Assignment</button>` :
                        `<button class="btn btn-warning" onclick="editGrade('${assignment._id || assignment.id}')">Edit Grade</button>`
                    }
                ` : ''}
                <button class="btn btn-secondary" onclick="showDashboardSection('verify')">Back to List</button>
            </div>
        </div>
    `;
}

function gradeAssignment(assignmentId) {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <h3>Grade Assignment</h3>
        <form id="gradeForm">
            <input type="hidden" id="assignmentId" value="${assignmentId}">
            
            <div class="form-group">
                <label for="grade">Grade:</label>
                <select id="grade" name="grade" required>
                    <option value="">Select Grade</option>
                    <option value="A+">A+ (90-100)</option>
                    <option value="A">A (85-89)</option>
                    <option value="B+">B+ (80-84)</option>
                    <option value="B">B (75-79)</option>
                    <option value="C+">C+ (70-74)</option>
                    <option value="C">C (65-69)</option>
                    <option value="D+">D+ (60-64)</option>
                    <option value="D">D (55-59)</option>
                    <option value="F">F (0-54)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="feedback">Feedback (Optional):</label>
                <textarea id="feedback" name="feedback" rows="6" placeholder="Provide feedback to the student..."></textarea>
            </div>
            
            <div class="actions">
                <button type="submit" class="btn btn-success">Submit Grade</button>
                <button type="button" class="btn btn-secondary" onclick="viewAssignmentDetails('${assignmentId}')">Cancel</button>
            </div>
        </form>
    `;
    
    document.getElementById('gradeForm').addEventListener('submit', handleGradeSubmission);
}

async function handleGradeSubmission(e) {
    e.preventDefault();
    
    const assignmentId = document.getElementById('assignmentId').value;
    const grade = document.getElementById('grade').value;
    const feedback = document.getElementById('feedback').value;
    
    try {
        const response = await fetch(`/api/assignments/grade/${assignmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grade,
                feedback,
                gradedBy: currentUser.name
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Grade submitted successfully!', 'success');
            viewAssignmentDetails(assignmentId);
        } else {
            showMessage('Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Grading error:', error);
        
        // Fallback to demo mode
        const assignment = assignments.find(a => (a._id || a.id) == assignmentId);
        if (assignment) {
            assignment.grade = grade;
            assignment.feedback = feedback;
            assignment.status = 'graded';
            assignment.gradedBy = currentUser.name;
            assignment.gradedAt = new Date();
        }
        showMessage('Grade submitted successfully! (Demo Mode)', 'success');
        viewAssignmentDetails(assignmentId);
    }
}

async function editGrade(assignmentId) {
    try {
        const response = await fetch(`/api/assignments/submission/${assignmentId}`);
        const result = await response.json();
        
        if (result.success) {
            const assignment = result.submission;
            const content = document.getElementById('dashboardContent');
            
            content.innerHTML = `
                <h3>Edit Grade</h3>
                <form id="editGradeForm">
                    <input type="hidden" id="assignmentId" value="${assignmentId}">
                    
                    <div class="form-group">
                        <label for="grade">Grade:</label>
                        <select id="grade" name="grade" required>
                            <option value="">Select Grade</option>
                            <option value="A+" ${assignment.grade === 'A+' ? 'selected' : ''}>A+ (90-100)</option>
                            <option value="A" ${assignment.grade === 'A' ? 'selected' : ''}>A (85-89)</option>
                            <option value="B+" ${assignment.grade === 'B+' ? 'selected' : ''}>B+ (80-84)</option>
                            <option value="B" ${assignment.grade === 'B' ? 'selected' : ''}>B (75-79)</option>
                            <option value="C+" ${assignment.grade === 'C+' ? 'selected' : ''}>C+ (70-74)</option>
                            <option value="C" ${assignment.grade === 'C' ? 'selected' : ''}>C (65-69)</option>
                            <option value="D+" ${assignment.grade === 'D+' ? 'selected' : ''}>D+ (60-64)</option>
                            <option value="D" ${assignment.grade === 'D' ? 'selected' : ''}>D (55-59)</option>
                            <option value="F" ${assignment.grade === 'F' ? 'selected' : ''}>F (0-54)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="feedback">Feedback:</label>
                        <textarea id="feedback" name="feedback" rows="6">${assignment.feedback || ''}</textarea>
                    </div>
                    
                    <div class="actions">
                        <button type="submit" class="btn btn-success">Update Grade</button>
                        <button type="button" class="btn btn-secondary" onclick="viewAssignmentDetails('${assignmentId}')">Cancel</button>
                    </div>
                </form>
            `;
            
            document.getElementById('editGradeForm').addEventListener('submit', handleGradeSubmission);
        }
    } catch (error) {
        console.error('Error loading assignment for editing:', error);
        showMessage('Failed to load assignment details.', 'error');
    }
}

// Admin Functions
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
            '<td>' + (assignment.filename || 'N/A') + '</td>' +
            '<td>' + new Date(assignment.uploadDate || assignment.submittedAt).toLocaleDateString() + '</td>' +
            '<td>' + assignment.status + '</td>' +
            '<td>' + (assignment.grade || 'Pending') + '</td>' +
            '<td><button class="btn btn-secondary" onclick="viewAssignmentDetails(\'' + (assignment._id || assignment.id) + '\')">View Details</button></td>' +
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

// Utility Functions
function getStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'submitted': return 'status-submitted';
        case 'graded': return 'status-graded';
        case 'pending': return 'status-pending';
        case 'late': return 'status-late';
        default: return 'status-default';
    }
}

async function viewSubmission(submissionId) {
    try {
        const response = await fetch(`/api/assignments/submission/${submissionId}`);
        const result = await response.json();
        
        if (result.success) {
            displaySubmissionDetails(result.submission);
        } else {
            showMessage('Error loading submission details: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error fetching submission details:', error);
        showMessage('Failed to load submission details.', 'error');
    }
}

function displaySubmissionDetails(submission) {
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
        <h3>Submission Details</h3>
        <div class="submission-detail">
            <h4>${submission.title}</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Course Code:</label>
                    <span>${submission.courseCode}</span>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span class="status ${getStatusClass(submission.status)}">${submission.status}</span>
                </div>
                <div class="detail-item">
                    <label>Submitted:</label>
                    <span>${new Date(submission.submittedAt).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <label>Due Date:</label>
                    <span>${new Date(submission.dueDate).toLocaleString()}</span>
                </div>
                ${submission.grade ? `
                <div class="detail-item">
                    <label>Grade:</label>
                    <span class="grade">${submission.grade}</span>
                </div>
                ` : ''}
                ${submission.description ? `
                <div class="detail-item full-width">
                    <label>Description:</label>
                    <p>${submission.description}</p>
                </div>
                ` : ''}
                ${submission.feedback ? `
                <div class="detail-item full-width">
                    <label>Lecturer Feedback:</label>
                    <p class="feedback">${submission.feedback}</p>
                </div>
                ` : ''}
            </div>
            <div class="actions">
                ${submission.fileName ? `<button class="btn btn-primary" onclick="downloadFile('${submission._id}')">Download File</button>` : ''}
                <button class="btn btn-secondary" onclick="showDashboardSection('submissions')">Back to Submissions</button>
            </div>
        </div>
    `;
}

function downloadFile(submissionId) {
    window.open(`/api/assignments/download/${submissionId}`, '_blank');
}

function exportAssignments() {
    if (typeof XLSX === 'undefined') {
        showMessage('Excel export feature not available.', 'error');
        return;
    }

    const data = assignments.map(a => ({
        'Student': a.studentName,
        'Title': a.title,
        'Filename': a.filename || 'N/A',
        'Upload Date': new Date(a.uploadDate || a.submittedAt).toLocaleDateString(),
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

// Message and Modal Functions
function showMessage(message, type) {
    const existingMessage = document.querySelector('.status-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'status-message status-' + type;
    messageDiv.textContent = message;
    
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
    
    showMessage('Thank you, ' + name + '! Your message has been sent. We will get back to you soon.', 'success');
    event.target.reset();
}

// Event Listeners and Initialization
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                closeModal();
            }
        });
    }

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    updateConnectionStatus();
    
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
    if (e.key === 'Escape') {
        closeModal();
    }
    
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (currentUser && currentUser.role === 'admin') {
            exportAssignments();
        }
    }
});

// Global error handlers
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showMessage('An unexpected error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showMessage('A network error occurred. Please check your connection.', 'warning');
});