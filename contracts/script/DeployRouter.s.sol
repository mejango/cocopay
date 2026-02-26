// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {CocoPayRouter} from "../src/CocoPayRouter.sol";
import {IJBMultiTerminal} from "../src/interfaces/IJBMultiTerminal.sol";
import {IPermit2} from "../src/interfaces/IPermit2.sol";

contract DeployRouter is Script {
    // Same on all chains
    IJBMultiTerminal constant TERMINAL = IJBMultiTerminal(0x2dB6d704058E552DeFE415753465df8dF0361846);
    IPermit2 constant PERMIT2 = IPermit2(0x000000000022D473030F116dDEE9F6B43aC78BA3);

    bytes32 constant SALT = bytes32(uint256(0xC0C0));

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        CocoPayRouter router = new CocoPayRouter{salt: SALT}(TERMINAL, PERMIT2);

        console.log("CocoPayRouter deployed at:", address(router));
        console.log("Terminal:", address(TERMINAL));
        console.log("Permit2:", address(PERMIT2));

        vm.stopBroadcast();
    }
}
