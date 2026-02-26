// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IJBMultiTerminal} from "./interfaces/IJBMultiTerminal.sol";
import {IPermit2} from "./interfaces/IPermit2.sol";

/// @title CocoPayRouter
/// @notice Stateless, immutable router for paying Juicebox projects.
///         Supports approve-based ERC-20, Permit2 single-signature, and native ETH payments.
///         One deployment per chain via CREATE2 (same address everywhere).
contract CocoPayRouter {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    // Immutables
    // ──────────────────────────────────────────────

    IJBMultiTerminal public immutable TERMINAL;
    IPermit2 public immutable PERMIT2;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    event PaymentRouted(
        uint256 indexed projectId,
        address indexed payer,
        address token,
        uint256 amount,
        address beneficiary,
        string memo
    );

    // ──────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────

    error ZeroAmount();

    // ──────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────

    constructor(IJBMultiTerminal terminal_, IPermit2 permit2_) {
        TERMINAL = terminal_;
        PERMIT2 = permit2_;
    }

    // ──────────────────────────────────────────────
    // Pay methods
    // ──────────────────────────────────────────────

    /// @notice Pay a project with an ERC-20 token (caller must have approved this contract).
    /// @param projectId The Juicebox project ID to pay.
    /// @param token The ERC-20 token address.
    /// @param amount The amount to pay (in token's smallest unit).
    /// @param beneficiary The address to receive project tokens.
    /// @param minReturnedTokens Minimum project tokens to receive (slippage protection).
    /// @param memo An on-chain memo string.
    function payProject(
        uint256 projectId,
        address token,
        uint256 amount,
        address beneficiary,
        uint256 minReturnedTokens,
        string calldata memo
    ) external {
        if (amount == 0) revert ZeroAmount();

        // Pull tokens from caller
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Approve terminal to spend tokens
        IERC20(token).forceApprove(address(TERMINAL), amount);

        // Pay the project
        TERMINAL.pay(projectId, token, amount, beneficiary, minReturnedTokens, memo, "");

        emit PaymentRouted(projectId, msg.sender, token, amount, beneficiary, memo);
    }

    /// @notice Pay a project using Permit2 (single-signature, no separate approve tx).
    /// @param projectId The Juicebox project ID to pay.
    /// @param amount The amount to pay.
    /// @param beneficiary The address to receive project tokens.
    /// @param minReturnedTokens Minimum project tokens to receive.
    /// @param memo An on-chain memo string.
    /// @param permit The Permit2 transfer permit.
    /// @param signature The Permit2 signature.
    function payProjectWithPermit2(
        uint256 projectId,
        uint256 amount,
        address beneficiary,
        uint256 minReturnedTokens,
        string calldata memo,
        IPermit2.PermitTransferFrom calldata permit,
        bytes calldata signature
    ) external {
        if (amount == 0) revert ZeroAmount();

        address token = permit.permitted.token;

        // Transfer tokens from caller via Permit2
        PERMIT2.permitTransferFrom(
            permit,
            IPermit2.SignatureTransferDetails({to: address(this), requestedAmount: amount}),
            msg.sender,
            signature
        );

        // Approve terminal to spend tokens
        IERC20(token).forceApprove(address(TERMINAL), amount);

        // Pay the project
        TERMINAL.pay(projectId, token, amount, beneficiary, minReturnedTokens, memo, "");

        emit PaymentRouted(projectId, msg.sender, token, amount, beneficiary, memo);
    }

    /// @notice Pay a project with native ETH.
    /// @param projectId The Juicebox project ID to pay.
    /// @param beneficiary The address to receive project tokens.
    /// @param minReturnedTokens Minimum project tokens to receive.
    /// @param memo An on-chain memo string.
    function payProjectETH(
        uint256 projectId,
        address beneficiary,
        uint256 minReturnedTokens,
        string calldata memo
    ) external payable {
        if (msg.value == 0) revert ZeroAmount();

        // Native token address used by Juicebox
        address nativeToken = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

        // Pay the project with ETH
        TERMINAL.pay{value: msg.value}(
            projectId, nativeToken, msg.value, beneficiary, minReturnedTokens, memo, ""
        );

        emit PaymentRouted(projectId, msg.sender, nativeToken, msg.value, beneficiary, memo);
    }
}
