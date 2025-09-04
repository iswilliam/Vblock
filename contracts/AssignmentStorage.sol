// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AssignmentStorage {
    struct Assignment {
        uint256 id;
        address student;
        string studentName;
        string title;
        string filename;
        string fileHash;
        uint256 timestamp;
        bool isGraded;
        uint8 grade;
        string feedback;
        address gradedBy;
    }

    mapping(uint256 => Assignment) public assignments;
    mapping(string => bool) public hashExists;
    mapping(address => uint256[]) public studentAssignments;
    
    uint256 public assignmentCounter;
    
    // Role-based access control
    mapping(address => string) public userRoles;
    address public admin;
    
    event AssignmentSubmitted(
        uint256 indexed assignmentId,
        address indexed student,
        string fileHash,
        uint256 timestamp
    );
    
    event AssignmentGraded(
        uint256 indexed assignmentId,
        address indexed gradedBy,
        uint8 grade
    );
    
    event RoleAssigned(address indexed user, string role);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyLecturerOrAdmin() {
        require(
            keccak256(abi.encodePacked(userRoles[msg.sender])) == keccak256(abi.encodePacked("lecturer")) ||
            msg.sender == admin,
            "Only lecturer or admin can perform this action"
        );
        _;
    }
    
    modifier onlyStudent() {
        require(
            keccak256(abi.encodePacked(userRoles[msg.sender])) == keccak256(abi.encodePacked("student")),
            "Only students can submit assignments"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        userRoles[msg.sender] = "admin";
        assignmentCounter = 0;
    }
    
    function assignRole(address user, string memory role) public onlyAdmin {
        userRoles[user] = role;
        emit RoleAssigned(user, role);
    }
    
    function submitAssignment(
        string memory studentName,
        string memory title,
        string memory filename,
        string memory fileHash
    ) public onlyStudent returns (uint256) {
        // Check for duplicate hash
        require(!hashExists[fileHash], "Assignment with this hash already exists");
        
        assignmentCounter++;
        uint256 newAssignmentId = assignmentCounter;
        
        assignments[newAssignmentId] = Assignment({
            id: newAssignmentId,
            student: msg.sender,
            studentName: studentName,
            title: title,
            filename: filename,
            fileHash: fileHash,
            timestamp: block.timestamp,
            isGraded: false,
            grade: 0,
            feedback: "",
            gradedBy: address(0)
        });
        
        hashExists[fileHash] = true;
        studentAssignments[msg.sender].push(newAssignmentId);
        
        emit AssignmentSubmitted(newAssignmentId, msg.sender, fileHash, block.timestamp);
        return newAssignmentId;
    }
    
    function gradeAssignment(
        uint256 assignmentId,
        uint8 grade,
        string memory feedback
    ) public onlyLecturerOrAdmin {
        require(assignments[assignmentId].id != 0, "Assignment does not exist");
        require(!assignments[assignmentId].isGraded, "Assignment already graded");
        require(grade <= 100, "Grade must be between 0 and 100");
        
        assignments[assignmentId].isGraded = true;
        assignments[assignmentId].grade = grade;
        assignments[assignmentId].feedback = feedback;
        assignments[assignmentId].gradedBy = msg.sender;
        
        emit AssignmentGraded(assignmentId, msg.sender, grade);
    }
    
    function verifyAssignment(uint256 assignmentId) public view returns (
        bool exists,
        string memory fileHash,
        address student,
        uint256 timestamp
    ) {
        Assignment memory assignment = assignments[assignmentId];
        return (
            assignment.id != 0,
            assignment.fileHash,
            assignment.student,
            assignment.timestamp
        );
    }
    
    function getAssignment(uint256 assignmentId) public view returns (Assignment memory) {
        return assignments[assignmentId];
    }
    
    function getStudentAssignments(address student) public view returns (uint256[] memory) {
        return studentAssignments[student];
    }
    
    function getAllAssignments() public view returns (Assignment[] memory) {
        Assignment[] memory allAssignments = new Assignment[](assignmentCounter);
        for (uint256 i = 1; i <= assignmentCounter; i++) {
            allAssignments[i - 1] = assignments[i];
        }
        return allAssignments;
    }
    
    function checkDuplicateHash(string memory fileHash) public view returns (bool) {
        return hashExists[fileHash];
    }
}