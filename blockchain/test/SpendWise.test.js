// blockchain/test/SpendWise.test.js
// Full test suite for all 5 SpendWise contracts.
// Run with: npx hardhat test

const { expect }        = require('chai');
const { ethers }        = require('hardhat');
const { time }          = require('@nomicfoundation/hardhat-network-helpers');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toBytes32 = (str) => ethers.encodeBytes32String(str.slice(0, 31));
const toLeaf    = (hex) => ethers.keccak256(ethers.toUtf8Bytes(hex));
const ether     = (n)   => ethers.parseEther(String(n));
const INR       = (n)   => BigInt(n) * 100n; // n rupees → paise

// ─── AuditTrail ──────────────────────────────────────────────────────────────
describe('AuditTrail', () => {
  let contract, owner, oracle, user;

  beforeEach(async () => {
    [owner, oracle, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('AuditTrail');
    contract = await Factory.deploy();
    await contract.addOracle(oracle.address);
  });

  describe('Single hash anchoring', () => {
    it('anchors a hash and emits HashAnchored', async () => {
      const hash = toLeaf('tx-abc-123');
      await expect(contract.connect(oracle).anchorHash(hash))
        .to.emit(contract, 'HashAnchored')
        .withArgs(oracle.address, hash, await ethers.provider.getBlockNumber() + 1, await time.latest() + 1);
    });

    it('reverts on duplicate hash', async () => {
      const hash = toLeaf('tx-dup');
      await contract.connect(oracle).anchorHash(hash);
      await expect(contract.connect(oracle).anchorHash(hash))
        .to.be.revertedWith('AuditTrail: hash already anchored');
    });

    it('reverts when called by non-oracle', async () => {
      await expect(contract.connect(user).anchorHash(toLeaf('x')))
        .to.be.revertedWith('AuditTrail: not an authorized oracle');
    });

    it('isAnchored returns correct value', async () => {
      const hash = toLeaf('check-me');
      expect(await contract.isAnchored(hash)).to.be.false;
      await contract.connect(oracle).anchorHash(hash);
      expect(await contract.isAnchored(hash)).to.be.true;
    });
  });

  describe('Merkle batch anchoring', () => {
    // Build a simple Merkle tree from 4 leaves
    let leaves, root;
    beforeEach(() => {
      leaves = ['tx1', 'tx2', 'tx3', 'tx4'].map(s => toLeaf(s));
      // Simple 2-level tree: root = hash(hash(l0,l1), hash(l2,l3))
      const h01  = ethers.keccak256(ethers.concat([leaves[0], leaves[1]]));
      const h23  = ethers.keccak256(ethers.concat([leaves[2], leaves[3]]));
      root = ethers.keccak256(ethers.concat([h01, h23]));
    });

    it('anchors a batch and emits BatchAnchored', async () => {
      await expect(contract.connect(oracle).anchorBatch(root, 4, '2024-01-15'))
        .to.emit(contract, 'BatchAnchored')
        .withArgs(oracle.address, root, 1, 4, '2024-01-15', await time.latest() + 1);
    });

    it('prevents duplicate date anchoring', async () => {
      await contract.connect(oracle).anchorBatch(root, 4, '2024-01-15');
      const root2 = toLeaf('another-root');
      await expect(contract.connect(oracle).anchorBatch(root2, 2, '2024-01-15'))
        .to.be.revertedWith('AuditTrail: batch already anchored for this date');
    });

    it('getBatchByDate returns correct data', async () => {
      await contract.connect(oracle).anchorBatch(root, 4, '2024-01-15');
      const batch = await contract.getBatchByDate('2024-01-15');
      expect(batch.merkleRoot).to.equal(root);
      expect(batch.txCount).to.equal(4);
      expect(batch.batchDate).to.equal('2024-01-15');
    });

    it('totalBatches increments correctly', async () => {
      expect(await contract.totalBatches()).to.equal(0);
      await contract.connect(oracle).anchorBatch(root, 4, '2024-01-15');
      expect(await contract.totalBatches()).to.equal(1);
    });

    it('verifyProof reverts for unknown root', async () => {
      const unknownRoot = toLeaf('ghost');
      await expect(contract.verifyProof(unknownRoot, [], leaves[0]))
        .to.be.revertedWith('AuditTrail: batch root not found on-chain');
    });
  });
});

// ─── FinancialScoreCert ───────────────────────────────────────────────────────
describe('FinancialScoreCert', () => {
  let contract, owner, oracle, userA, userB;

  beforeEach(async () => {
    [owner, oracle, userA, userB] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('FinancialScoreCert');
    contract = await Factory.deploy();
    await contract.addOracle(oracle.address);
  });

  describe('Minting', () => {
    it('mints an NFT and emits ScoreMinted', async () => {
      await expect(contract.connect(oracle).mintScore(userA.address, 85, 'Rahul'))
        .to.emit(contract, 'ScoreMinted')
        .withArgs(userA.address, 1, 85, 'A+');
    });

    it('assigns correct grade: A+ for 90+', async () => {
      await contract.connect(oracle).mintScore(userA.address, 92, 'Test');
      const data = await contract.getScore(userA.address);
      expect(data.grade).to.equal('A+');
    });

    it('assigns correct grade: B for 70-79', async () => {
      await contract.connect(oracle).mintScore(userA.address, 75, 'Test');
      const data = await contract.getScore(userA.address);
      expect(data.grade).to.equal('B');
    });

    it('assigns correct grade: F for < 50', async () => {
      await contract.connect(oracle).mintScore(userA.address, 30, 'Test');
      const data = await contract.getScore(userA.address);
      expect(data.grade).to.equal('F');
    });

    it('prevents minting twice for same address', async () => {
      await contract.connect(oracle).mintScore(userA.address, 80, 'Rahul');
      await expect(contract.connect(oracle).mintScore(userA.address, 70, 'Rahul'))
        .to.be.revertedWith('FinancialScoreCert: already has NFT, use updateScore');
    });

    it('reverts on score > 100', async () => {
      await expect(contract.connect(oracle).mintScore(userA.address, 101, 'X'))
        .to.be.revertedWith('FinancialScoreCert: score > 100');
    });

    it('non-oracle cannot mint', async () => {
      await expect(contract.connect(userB).mintScore(userA.address, 80, 'X'))
        .to.be.revertedWith('FinancialScoreCert: not an oracle');
    });
  });

  describe('Score updates', () => {
    beforeEach(async () => {
      await contract.connect(oracle).mintScore(userA.address, 60, 'Rahul');
    });

    it('updates score when change >= 5 and emits ScoreUpdated', async () => {
      await expect(contract.connect(oracle).updateScore(userA.address, 70))
        .to.emit(contract, 'ScoreUpdated')
        .withArgs(userA.address, 1, 60, 70, 'B');
    });

    it('reverts when change < 5 (threshold)', async () => {
      await expect(contract.connect(oracle).updateScore(userA.address, 63))
        .to.be.revertedWith('FinancialScoreCert: score change below threshold');
    });

    it('grade updates correctly after score change', async () => {
      await contract.connect(oracle).updateScore(userA.address, 85);
      const data = await contract.getScore(userA.address);
      expect(data.grade).to.equal('A+');
      expect(data.score).to.equal(85);
    });
  });

  describe('tokenURI — on-chain SVG', () => {
    it('returns a base64 data URI', async () => {
      await contract.connect(oracle).mintScore(userA.address, 80, 'Rahul');
      const uri = await contract.tokenURI(1);
      expect(uri).to.match(/^data:application\/json;base64,/);
    });

    it('decoded JSON contains correct score', async () => {
      await contract.connect(oracle).mintScore(userA.address, 80, 'Rahul');
      const uri = await contract.tokenURI(1);
      const json = JSON.parse(
        Buffer.from(uri.replace('data:application/json;base64,', ''), 'base64').toString()
      );
      expect(json.name).to.equal('SpendWise Score #1');
      const scoreAttr = json.attributes.find(a => a.trait_type === 'Score');
      expect(scoreAttr.value).to.equal(80);
    });
  });
});

// ─── GroupSettlement ──────────────────────────────────────────────────────────
describe('GroupSettlement', () => {
  let contract, owner, creditor, debtor, stranger;
  const AMOUNT = ether(0.5); // 0.5 MATIC

  beforeEach(async () => {
    [owner, creditor, debtor, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('GroupSettlement');
    contract = await Factory.deploy();
  });

  async function createAndFund() {
    const tx   = await contract.connect(creditor).createSettlement('grp-1', creditor.address, debtor.address, AMOUNT, 2);
    const rcpt = await tx.wait();
    const id   = 1n; // first settlement
    await contract.connect(debtor).deposit(id, { value: AMOUNT });
    return id;
  }

  describe('Create', () => {
    it('creates a settlement and emits SettlementCreated', async () => {
      await expect(
        contract.connect(creditor).createSettlement('grp-1', creditor.address, debtor.address, AMOUNT, 2)
      ).to.emit(contract, 'SettlementCreated').withArgs('grp-1', creditor.address, debtor.address, AMOUNT);
    });

    it('reverts when creditor == debtor', async () => {
      await expect(
        contract.connect(creditor).createSettlement('g', creditor.address, creditor.address, AMOUNT, 1)
      ).to.be.revertedWith('GroupSettlement: creditor == debtor');
    });

    it('reverts on zero amount', async () => {
      await expect(
        contract.connect(creditor).createSettlement('g', creditor.address, debtor.address, 0, 1)
      ).to.be.revertedWith('GroupSettlement: zero amount');
    });
  });

  describe('Deposit', () => {
    it('debtor can deposit exact amount', async () => {
      await contract.connect(creditor).createSettlement('g', creditor.address, debtor.address, AMOUNT, 1);
      await expect(contract.connect(debtor).deposit(1, { value: AMOUNT }))
        .to.emit(contract, 'FundsDeposited').withArgs(1, debtor.address, AMOUNT);
    });

    it('reverts on wrong amount', async () => {
      await contract.connect(creditor).createSettlement('g', creditor.address, debtor.address, AMOUNT, 1);
      await expect(contract.connect(debtor).deposit(1, { value: ether(0.1) }))
        .to.be.revertedWith('GroupSettlement: wrong amount');
    });

    it('only debtor can deposit', async () => {
      await contract.connect(creditor).createSettlement('g', creditor.address, debtor.address, AMOUNT, 1);
      await expect(contract.connect(stranger).deposit(1, { value: AMOUNT }))
        .to.be.revertedWith('GroupSettlement: only debtor can deposit');
    });
  });

  describe('Approve & Release', () => {
    it('releases funds when approval threshold is met', async () => {
      const id = await createAndFund();
      const creditorBefore = await ethers.provider.getBalance(creditor.address);

      // 2 approvals required — creditor + debtor
      await contract.connect(creditor).approve(id);
      await expect(contract.connect(debtor).approve(id))
        .to.emit(contract, 'FundsReleased');

      const s = await contract.getSettlement(id);
      expect(s.status).to.equal(2); // Released
    });

    it('cannot approve twice', async () => {
      const id = await createAndFund();
      await contract.connect(creditor).approve(id);
      await expect(contract.connect(creditor).approve(id))
        .to.be.revertedWith('GroupSettlement: already approved');
    });

    it('stranger cannot approve', async () => {
      const id = await createAndFund();
      await expect(contract.connect(stranger).approve(id))
        .to.be.revertedWith('GroupSettlement: not a party to this settlement');
    });
  });

  describe('Dispute', () => {
    it('party can raise dispute', async () => {
      const id = await createAndFund();
      await expect(contract.connect(creditor).raiseDispute(id, 'Never received goods'))
        .to.emit(contract, 'DisputeRaised').withArgs(id, creditor.address, 'Never received goods');

      const s = await contract.getSettlement(id);
      expect(s.status).to.equal(3); // Disputed
    });

    it('owner resolves dispute in favour of creditor', async () => {
      const id = await createAndFund();
      await contract.connect(creditor).raiseDispute(id, 'Dispute');

      await expect(contract.connect(owner).resolveDispute(id, creditor.address))
        .to.emit(contract, 'DisputeResolved').withArgs(id, owner.address, creditor.address);
    });

    it('stranger cannot raise dispute', async () => {
      const id = await createAndFund();
      await expect(contract.connect(stranger).raiseDispute(id, 'X'))
        .to.be.revertedWith('GroupSettlement: only parties can dispute');
    });
  });

  describe('Emergency withdrawal', () => {
    it('owner can emergency withdraw after 7 days', async () => {
      const id = await createAndFund();
      await time.increase(7 * 24 * 60 * 60 + 1); // 7 days + 1 sec

      await expect(contract.connect(owner).emergencyWithdraw(id))
        .to.emit(contract, 'EmergencyWithdrawal').withArgs(id, AMOUNT);
    });

    it('reverts before timelock expires', async () => {
      const id = await createAndFund();
      await expect(contract.connect(owner).emergencyWithdraw(id))
        .to.be.revertedWith('GroupSettlement: timelock not expired');
    });
  });
});

// ─── SpendWiseBudgetCommitment ────────────────────────────────────────────────
describe('SpendWiseBudgetCommitment', () => {
  let contract, owner, oracle, user, charity;
  const STAKE = ether(0.1);
  const MONTH = 202401n; // January 2024
  const LIMIT = INR(15000); // ₹15,000

  beforeEach(async () => {
    [owner, oracle, user, charity] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('SpendWiseBudgetCommitment');
    contract = await Factory.deploy(charity.address);
    await contract.addOracle(oracle.address);
  });

  async function createCommitment() {
    await contract.connect(user).createCommitment(LIMIT, MONTH, ethers.ZeroAddress, { value: STAKE });
    return 1n; // first commitment ID
  }

  describe('Create', () => {
    it('creates a commitment and emits CommitmentCreated', async () => {
      await expect(
        contract.connect(user).createCommitment(LIMIT, MONTH, ethers.ZeroAddress, { value: STAKE })
      ).to.emit(contract, 'CommitmentCreated');
    });

    it('reverts when stake below minimum', async () => {
      await expect(
        contract.connect(user).createCommitment(LIMIT, MONTH, ethers.ZeroAddress, { value: ether(0.001) })
      ).to.be.revertedWith('SpendWiseBudgetCommitment: stake too low');
    });

    it('reverts on duplicate commitment for same month', async () => {
      await createCommitment();
      await expect(
        contract.connect(user).createCommitment(LIMIT, MONTH, ethers.ZeroAddress, { value: STAKE })
      ).to.be.revertedWith('SpendWiseBudgetCommitment: already have a commitment for this month');
    });
  });

  describe('Resolve — goal met', () => {
    it('refunds full stake and emits AchievementMinted when goal met', async () => {
      const id           = await createCommitment();
      const actualSpend  = INR(12000); // ₹12,000 < ₹15,000 limit

      const userBefore = await ethers.provider.getBalance(user.address);

      await expect(contract.connect(oracle).resolveCommitment(id, actualSpend))
        .to.emit(contract, 'CommitmentResolved')
        .and.to.emit(contract, 'AchievementMinted');

      const c = await contract.getCommitment(id);
      expect(c.status).to.equal(1); // Met
      expect(c.badge).to.not.equal('');
    });
  });

  describe('Resolve — goal missed', () => {
    it('sends penalty to charity and refunds remainder when goal missed', async () => {
      const id          = await createCommitment();
      const actualSpend = INR(18000); // ₹18,000 > ₹15,000 limit

      const charityBefore = await ethers.provider.getBalance(charity.address);

      await contract.connect(oracle).resolveCommitment(id, actualSpend);

      const charityAfter = await ethers.provider.getBalance(charity.address);
      const c = await contract.getCommitment(id);

      expect(c.status).to.equal(2); // Missed
      // 20% of 0.1 MATIC = 0.02 MATIC goes to charity
      expect(charityAfter - charityBefore).to.equal(ether(0.02));
    });
  });

  describe('Cancel', () => {
    it('sends full stake to charity on cancel', async () => {
      const id            = await createCommitment();
      const charityBefore = await ethers.provider.getBalance(charity.address);

      await contract.connect(user).cancelCommitment(id);

      const charityAfter = await ethers.provider.getBalance(charity.address);
      expect(charityAfter - charityBefore).to.equal(STAKE);

      const c = await contract.getCommitment(id);
      expect(c.status).to.equal(3); // Cancelled
    });

    it('non-owner cannot cancel', async () => {
      const id = await createCommitment();
      await expect(contract.connect(oracle).cancelCommitment(id))
        .to.be.revertedWith('SpendWiseBudgetCommitment: not your commitment');
    });
  });

  describe('Admin', () => {
    it('owner can update charity wallet', async () => {
      const [, , , , newCharity] = await ethers.getSigners();
      await expect(contract.connect(owner).updateCharityWallet(newCharity.address))
        .to.emit(contract, 'CharityAddressUpdated');
    });

    it('owner can update penalty rate', async () => {
      await expect(contract.connect(owner).updatePenaltyRate(1000))
        .to.emit(contract, 'PenaltyRateUpdated').withArgs(2000, 1000);
    });

    it('reverts when penalty rate > 50%', async () => {
      await expect(contract.connect(owner).updatePenaltyRate(6000))
        .to.be.revertedWith('SpendWiseBudgetCommitment: max penalty is 50%');
    });
  });
});

// ─── FinancialPassport ────────────────────────────────────────────────────────
describe('FinancialPassport', () => {
  let contract, owner, oracle, userA, verifier;

  beforeEach(async () => {
    [owner, oracle, userA, verifier] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('FinancialPassport');
    contract = await Factory.deploy();
    await contract.addOracle(oracle.address);
  });

  describe('Issuance', () => {
    it('issues a passport and emits PassportIssued', async () => {
      await expect(contract.connect(oracle).issuePassport(userA.address, 85, 'Rahul'))
        .to.emit(contract, 'PassportIssued')
        .withArgs(userA.address, 1, 'Excellent', 85);
    });

    it('assigns correct tier: Excellent for 80+', async () => {
      await contract.connect(oracle).issuePassport(userA.address, 82, 'Test');
      const p = await contract.viewPassport(userA.address);
      expect(p.tier).to.equal('Excellent');
    });

    it('assigns correct tier: Good for 60-79', async () => {
      await contract.connect(oracle).issuePassport(userA.address, 65, 'Test');
      const p = await contract.viewPassport(userA.address);
      expect(p.tier).to.equal('Good');
    });

    it('assigns correct tier: Poor for < 40', async () => {
      await contract.connect(oracle).issuePassport(userA.address, 20, 'Test');
      const p = await contract.viewPassport(userA.address);
      expect(p.tier).to.equal('Poor');
    });

    it('reverts on double issuance', async () => {
      await contract.connect(oracle).issuePassport(userA.address, 80, 'Rahul');
      await expect(contract.connect(oracle).issuePassport(userA.address, 70, 'Rahul'))
        .to.be.revertedWith('FinancialPassport: passport already issued');
    });
  });

  describe('Soulbound — no transfers', () => {
    it('reverts on transfer attempt', async () => {
      await contract.connect(oracle).issuePassport(userA.address, 80, 'Rahul');
      await expect(
        contract.connect(userA).transferFrom(userA.address, verifier.address, 1)
      ).to.be.revertedWith('FinancialPassport: soulbound — cannot transfer');
    });
  });

  describe('Update', () => {
    beforeEach(async () => {
      await contract.connect(oracle).issuePassport(userA.address, 65, 'Rahul');
    });

    it('updates tier and emits PassportUpdated', async () => {
      await expect(contract.connect(oracle).updatePassport(userA.address, 85))
        .to.emit(contract, 'PassportUpdated')
        .withArgs(userA.address, 1, 'Good', 'Excellent', 85);
    });

    it('tier correctly reflects new score', async () => {
      await contract.connect(oracle).updatePassport(userA.address, 35);
      const p = await contract.viewPassport(userA.address);
      expect(p.tier).to.equal('Poor');
    });
  });

  describe('B2B verification', () => {
    beforeEach(async () => {
      await contract.connect(oracle).issuePassport(userA.address, 80, 'Rahul');
    });

    it('getPassport emits PassportVerified and increments verificationCount', async () => {
      await expect(contract.connect(verifier).getPassport(userA.address))
        .to.emit(contract, 'PassportVerified')
        .withArgs(userA.address, verifier.address);

      const p = await contract.viewPassport(userA.address);
      expect(p.verificationCount).to.equal(1n);
    });

    it('returns correct tier and score to verifier', async () => {
      const [tier, score] = await contract.connect(verifier).getPassport.staticCall(userA.address);
      expect(tier).to.equal('Excellent');
      expect(score).to.equal(80);
    });

    it('reverts when no passport exists', async () => {
      const [, , , , nobody] = await ethers.getSigners();
      await expect(contract.connect(verifier).getPassport(nobody.address))
        .to.be.revertedWith('FinancialPassport: no passport for this address');
    });
  });

  describe('tokenURI — on-chain SVG', () => {
    it('returns a valid base64 data URI', async () => {
      await contract.connect(oracle).issuePassport(userA.address, 80, 'Rahul');
      const uri = await contract.tokenURI(1);
      expect(uri).to.match(/^data:application\/json;base64,/);
    });

    it('decoded JSON has correct tier in attributes', async () => {
      await contract.connect(oracle).issuePassport(userA.address, 80, 'Rahul');
      const uri  = await contract.tokenURI(1);
      const json = JSON.parse(
        Buffer.from(uri.replace('data:application/json;base64,', ''), 'base64').toString()
      );
      const tierAttr = json.attributes.find(a => a.trait_type === 'Tier');
      expect(tierAttr.value).to.equal('Excellent');

      const soulbound = json.attributes.find(a => a.trait_type === 'Soulbound');
      expect(soulbound.value).to.be.true;
    });
  });
});