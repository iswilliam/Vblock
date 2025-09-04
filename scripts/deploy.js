const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");
  
  // Get the ContractFactory and Signers
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("📝 Deploying contract with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());
  
  // Deploy the contract
  const AssignmentStorage = await hre.ethers.getContractFactory("AssignmentStorage");
  const assignmentStorage = await AssignmentStorage.deploy();
  
  await assignmentStorage.deployed();
  
  console.log("✅ AssignmentStorage deployed to:", assignmentStorage.address);
  console.log("🏗️ Transaction hash:", assignmentStorage.deployTransaction.hash);
  
  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await assignmentStorage.deployTransaction.wait(5);
  
  // Setup initial roles
  console.log("🔧 Setting up initial configuration...");
  
  // You can add initial lecturers and students here
  const lecturerAddress = "0x..."; // Replace with actual lecturer address
  const studentAddress = "0x...";  // Replace with actual student address
  
  if (lecturerAddress !== "0x...") {
    const tx1 = await assignmentStorage.assignRole(lecturerAddress, "lecturer");
    await tx1.wait();
    console.log("👩‍🏫 Lecturer role assigned to:", lecturerAddress);
  }
  
  if (studentAddress !== "0x...") {
    const tx2 = await assignmentStorage.assignRole(studentAddress, "student");
    await tx2.wait();
    console.log("👨‍🎓 Student role assigned to:", studentAddress);
  }
  
  // Verify contract on Etherscan (if API key is provided)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("📋 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: assignmentStorage.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("❌ Error verifying contract:", error.message);
    }
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: assignmentStorage.address,
    deployerAddress: deployer.address,
    transactionHash: assignmentStorage.deployTransaction.hash,
    blockNumber: assignmentStorage.deployTransaction.blockNumber,
    gasUsed: assignmentStorage.deployTransaction.gasLimit?.toString(),
    timestamp: new Date().toISOString()
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📄 Deployment Summary:");
  console.log("===================");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", assignmentStorage.address);
  console.log("Deployer:", deployer.address);
  console.log("Transaction:", assignmentStorage.deployTransaction.hash);
  console.log("\n🔧 Next Steps:");
  console.log("1. Update your .env file with CONTRACT_ADDRESS=" + assignmentStorage.address);
  console.log("2. Fund your contract and user wallets with testnet ETH");
  console.log("3. Start your backend server: npm run start");
  console.log("4. Access your app at: http://localhost:3000");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });