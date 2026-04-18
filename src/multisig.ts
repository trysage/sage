import * as multisig from "@sqds/multisig";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

export interface CreateMultisigParams {
  connection: Connection;
  creator: Keypair;
  members: { key: PublicKey; permissions: multisig.types.Permissions }[];
  threshold: number;
  timeLock?: number;
  treasury?: PublicKey;
}

export interface CreateMultisigResult {
  multisigPda: PublicKey;
  vaultPda: PublicKey;
  createKey: Keypair;
  signature: string;
}

async function resolveTreasury(
  connection: Connection,
  override?: PublicKey
): Promise<PublicKey> {
  if (override) return override;
  try {
    const [configPda] = multisig.getProgramConfigPda({});
    const config = await multisig.accounts.ProgramConfig.fromAccountAddress(
      connection,
      configPda
    );
    return config.treasury;
  } catch {
    return SystemProgram.programId;
  }
}

export async function createMultisig(
  params: CreateMultisigParams
): Promise<CreateMultisigResult> {
  const { connection, creator, members, threshold, timeLock = 0, treasury: treasuryOverride } = params;

  const treasury = await resolveTreasury(connection, treasuryOverride);
  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

  const signature = await multisig.rpc.multisigCreateV2({
    connection,
    treasury,
    createKey,
    creator,
    multisigPda,
    configAuthority: null,
    timeLock,
    members,
    threshold,
    rentCollector: null,
    sendOptions: { skipPreflight: true },
  });

  return { multisigPda, vaultPda, createKey, signature };
}

export function deriveVaultPda(
  multisigPda: PublicKey,
  index: number = 0
): PublicKey {
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index });
  return vaultPda;
}

export async function getMultisigState(
  connection: Connection,
  multisigPda: PublicKey
) {
  return multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
}

export async function getProposalState(
  connection: Connection,
  multisigPda: PublicKey,
  transactionIndex: bigint
) {
  const [proposalPda] = multisig.getProposalPda({ multisigPda, transactionIndex });
  return multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda);
}
