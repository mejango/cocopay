// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CocoPayRouter} from "../src/CocoPayRouter.sol";
import {IJBMultiTerminal} from "../src/interfaces/IJBMultiTerminal.sol";
import {IPermit2} from "../src/interfaces/IPermit2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ──────────────────────────────────────────────
// Mock contracts
// ──────────────────────────────────────────────

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract MockTerminal is IJBMultiTerminal {
    uint256 public lastProjectId;
    address public lastToken;
    uint256 public lastAmount;
    address public lastBeneficiary;
    string public lastMemo;

    function pay(
        uint256 projectId,
        address token,
        uint256 amount,
        address beneficiary,
        uint256,
        string calldata memo,
        bytes calldata
    ) external payable override returns (uint256) {
        lastProjectId = projectId;
        lastToken = token;
        lastAmount = amount;
        lastBeneficiary = beneficiary;
        lastMemo = memo;

        // Pull ERC-20 tokens if not native
        if (token != 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        return 1e18; // Return minted project token count
    }
}

contract MockPermit2 is IPermit2 {
    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata
    ) external override {
        // Simulate Permit2: pull tokens from owner to `to`
        IERC20(permit.permitted.token).transferFrom(
            owner, transferDetails.to, transferDetails.requestedAmount
        );
    }
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

contract CocoPayRouterTest is Test {
    MockTerminal terminal;
    MockPermit2 permit2;
    MockERC20 usdc;
    CocoPayRouter router;

    address payer = makeAddr("payer");
    uint256 constant PROJECT_ID = 602;

    function setUp() public {
        terminal = new MockTerminal();
        permit2 = new MockPermit2();
        usdc = new MockERC20();
        router = new CocoPayRouter(IJBMultiTerminal(address(terminal)), IPermit2(address(permit2)));

        // Mint USDC to payer
        usdc.mint(payer, 1000e6);
    }

    // ── payProject (approve-based ERC-20) ──────

    function test_payProject() public {
        uint256 amount = 10e6; // 10 USDC

        vm.startPrank(payer);
        usdc.approve(address(router), amount);
        router.payProject(PROJECT_ID, address(usdc), amount, payer, 0, "CocoPay");
        vm.stopPrank();

        // Verify terminal received the call
        assertEq(terminal.lastProjectId(), PROJECT_ID);
        assertEq(terminal.lastToken(), address(usdc));
        assertEq(terminal.lastAmount(), amount);
        assertEq(terminal.lastBeneficiary(), payer);
        assertEq(terminal.lastMemo(), "CocoPay");

        // Verify tokens moved: payer → terminal
        assertEq(usdc.balanceOf(payer), 990e6);
        assertEq(usdc.balanceOf(address(terminal)), 10e6);
    }

    function test_payProject_differentBeneficiary() public {
        address beneficiary = makeAddr("beneficiary");
        uint256 amount = 5e6;

        vm.startPrank(payer);
        usdc.approve(address(router), amount);
        router.payProject(PROJECT_ID, address(usdc), amount, beneficiary, 0, "gift");
        vm.stopPrank();

        assertEq(terminal.lastBeneficiary(), beneficiary);
    }

    function test_payProject_revertsOnZeroAmount() public {
        vm.prank(payer);
        vm.expectRevert(CocoPayRouter.ZeroAmount.selector);
        router.payProject(PROJECT_ID, address(usdc), 0, payer, 0, "");
    }

    // ── payProjectWithPermit2 ──────────────────

    function test_payProjectWithPermit2() public {
        uint256 amount = 25e6;

        // Payer approves Permit2 (not router) — as real Permit2 flow works
        vm.prank(payer);
        usdc.approve(address(permit2), amount);

        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(usdc), amount: amount}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        vm.prank(payer);
        router.payProjectWithPermit2(PROJECT_ID, amount, payer, 0, "permit2 pay", permit, "");

        assertEq(terminal.lastProjectId(), PROJECT_ID);
        assertEq(terminal.lastAmount(), amount);
        assertEq(usdc.balanceOf(payer), 975e6);
    }

    function test_payProjectWithPermit2_revertsOnZeroAmount() public {
        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: address(usdc), amount: 0}),
            nonce: 0,
            deadline: block.timestamp + 1 hours
        });

        vm.prank(payer);
        vm.expectRevert(CocoPayRouter.ZeroAmount.selector);
        router.payProjectWithPermit2(PROJECT_ID, 0, payer, 0, "", permit, "");
    }

    // ── payProjectETH ──────────────────────────

    function test_payProjectETH() public {
        uint256 amount = 0.5 ether;
        vm.deal(payer, 1 ether);

        vm.prank(payer);
        router.payProjectETH{value: amount}(PROJECT_ID, payer, 0, "ETH pay");

        assertEq(terminal.lastProjectId(), PROJECT_ID);
        assertEq(terminal.lastAmount(), amount);
        assertEq(terminal.lastToken(), 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
        assertEq(terminal.lastMemo(), "ETH pay");
    }

    function test_payProjectETH_revertsOnZeroValue() public {
        vm.prank(payer);
        vm.expectRevert(CocoPayRouter.ZeroAmount.selector);
        router.payProjectETH{value: 0}(PROJECT_ID, payer, 0, "");
    }

    // ── Events ─────────────────────────────────

    function test_emitsPaymentRouted_erc20() public {
        uint256 amount = 10e6;

        vm.startPrank(payer);
        usdc.approve(address(router), amount);

        vm.expectEmit(true, true, false, true);
        emit CocoPayRouter.PaymentRouted(PROJECT_ID, payer, address(usdc), amount, payer, "test");

        router.payProject(PROJECT_ID, address(usdc), amount, payer, 0, "test");
        vm.stopPrank();
    }

    function test_emitsPaymentRouted_eth() public {
        uint256 amount = 0.1 ether;
        vm.deal(payer, 1 ether);

        vm.prank(payer);

        vm.expectEmit(true, true, false, true);
        emit CocoPayRouter.PaymentRouted(
            PROJECT_ID, payer, 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, amount, payer, "eth"
        );

        router.payProjectETH{value: amount}(PROJECT_ID, payer, 0, "eth");
    }

    // ── Immutables ─────────────────────────────

    function test_immutables() public view {
        assertEq(address(router.TERMINAL()), address(terminal));
        assertEq(address(router.PERMIT2()), address(permit2));
    }
}
