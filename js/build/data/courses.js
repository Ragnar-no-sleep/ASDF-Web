/**
 * ASDF Builder Courses - Rich Educational Content
 * Contenu pédagogique avec exercices pratiques
 */

export const COURSES = {
  'solana-fundamentals': {
    id: 'solana-fundamentals',
    title: 'Solana Fundamentals',
    description: 'Maîtrise les concepts fondamentaux de la blockchain Solana.',
    track: 'dev',
    xpReward: 500,
    lessons: [
      {
        id: 'sf-1',
        title: 'Architecture Solana',
        duration: '15 min',
        xp: 100,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Solana est une blockchain haute performance capable de traiter **65,000+ transactions par seconde** (TPS). Cette vitesse exceptionnelle repose sur des innovations architecturales uniques.`,
            },
            {
              type: 'diagram',
              title: 'Composants Clés',
              content: `
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE SOLANA                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ⏱️ PROOF OF HISTORY (PoH)                                  │
│   ├── Horloge cryptographique vérifiable                    │
│   ├── Séquence SHA-256 continue                             │
│   └── Timestamp sans consensus                               │
│                                                              │
│   🏛️ TOWER BFT                                               │
│   ├── Consensus basé sur PoH                                │
│   ├── Votes exponentiellement pondérés                      │
│   └── Finalité en ~400ms                                    │
│                                                              │
│   🌊 GULF STREAM                                             │
│   ├── Forwarding de transactions                            │
│   ├── Mempool distribué                                     │
│   └── Leaders connus à l'avance                             │
│                                                              │
│   ⚡ SEALEVEL                                                │
│   ├── Exécution parallèle                                   │
│   ├── Programmes stateless                                  │
│   └── GPU-friendly                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘`,
            },
            {
              type: 'concept',
              title: 'Proof of History (PoH)',
              text: `PoH n'est **pas** un mécanisme de consensus - c'est une **horloge cryptographique**.

Chaque nœud génère une séquence SHA-256:
\`\`\`
hash(0) → hash(1) → hash(2) → ... → hash(n)
\`\`\`

Cette séquence prouve que du temps s'est écoulé entre deux événements, **sans nécessiter de communication entre nœuds**.`,
            },
            {
              type: 'concept',
              title: 'Comptes vs Programmes',
              text: `Sur Solana, **tout est un compte**. Les programmes (smart contracts) sont **stateless** - ils ne stockent pas de données en eux-mêmes.

| Type | Description | Exemples |
|------|-------------|----------|
| **Program Account** | Code exécutable (immutable) | Token Program, votre dApp |
| **Data Account** | Données associées au programme | Token balances, user state |
| **Wallet Account** | Clé privée contrôlée par l'utilisateur | Phantom wallet |`,
            },
            {
              type: 'note',
              variant: 'tip',
              text: `💡 **Rent**: Stocker des données coûte ~0.00089 SOL par 128 bytes. Les comptes avec >2 ans de rent sont "rent-exempt" et permanents.`,
            },
          ],
        },
        resources: [
          {
            type: 'docs',
            title: 'Solana Architecture',
            url: 'https://solana.com/docs/intro/overview',
          },
          {
            type: 'video',
            title: 'How Solana Works (12min)',
            url: 'https://www.youtube.com/watch?v=BxYN_DEH2rw',
          },
        ],
      },
      {
        id: 'sf-2',
        title: 'Le Modèle de Compte',
        duration: '20 min',
        xp: 100,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Comprendre le modèle de compte est **essentiel** pour développer sur Solana. Contrairement à Ethereum (model de contrat), Solana sépare le code des données.`,
            },
            {
              type: 'diagram',
              title: "Structure d'un Compte",
              content: `
┌─────────────────────────────────────────┐
│              SOLANA ACCOUNT              │
├─────────────────────────────────────────┤
│  lamports: u64         (balance en SOL) │
│  owner: Pubkey         (qui peut modifier) │
│  executable: bool      (est-ce un programme?) │
│  rent_epoch: u64       (pour le rent) │
│  data: Vec<u8>         (données arbitraires) │
└─────────────────────────────────────────┘

Exemple: Token Account
┌─────────────────────────────────────────┐
│  owner: TokenProgram                     │
│  data: {                                 │
│    mint: Pubkey,      // Quel token?    │
│    owner: Pubkey,     // Qui possède?   │
│    amount: u64,       // Combien?       │
│    ...                                  │
│  }                                       │
└─────────────────────────────────────────┘`,
            },
            {
              type: 'concept',
              title: 'Program Derived Address (PDA)',
              text: `Les PDAs sont des adresses **déterministes** générées à partir:
- D'un **program ID**
- D'une ou plusieurs **seeds** (chaînes de bytes)

\`\`\`javascript
// Génération d'une PDA
const [pda, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("user_profile"),
    userWallet.toBuffer()
  ],
  programId
);
\`\`\`

**Propriété clé**: Les PDAs n'ont **pas de clé privée**. Seul le programme peut signer pour elles.`,
            },
            {
              type: 'note',
              variant: 'warning',
              text: `⚠️ **Sécurité**: Toujours valider que le PDA passé correspond aux seeds attendues. Un attaquant pourrait passer un faux compte.`,
            },
          ],
        },
        exercise: {
          type: 'code',
          title: 'Générer une PDA',
          instructions: `Complète le code pour générer une PDA qui stocke le profil d'un utilisateur.`,
          starterCode: `import { PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("YourProgram...");

function getUserProfilePDA(userWallet) {
  // TODO: Générer la PDA avec les seeds:
  // - "profile" (string)
  // - userWallet (PublicKey)

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      // Complète ici
    ],
    PROGRAM_ID
  );

  return { pda, bump };
}`,
          solution: `[Buffer.from("profile"), userWallet.toBuffer()]`,
          hints: [
            'Utilise Buffer.from() pour convertir la string "profile"',
            'Utilise .toBuffer() pour convertir la PublicKey',
          ],
          validation: code => {
            return (
              code.includes('Buffer.from') && code.includes('profile') && code.includes('toBuffer')
            );
          },
        },
        resources: [
          { type: 'docs', title: 'Account Model', url: 'https://solana.com/docs/core/accounts' },
          { type: 'docs', title: 'PDAs Explained', url: 'https://solana.com/docs/core/pda' },
        ],
      },
      {
        id: 'sf-3',
        title: 'Transactions & Instructions',
        duration: '18 min',
        xp: 100,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Une **transaction** Solana est un paquet atomique contenant une ou plusieurs **instructions**. Soit toutes les instructions réussissent, soit aucune.`,
            },
            {
              type: 'diagram',
              title: "Anatomie d'une Transaction",
              content: `
┌─────────────────────────────────────────────────────────────┐
│                      TRANSACTION                             │
├─────────────────────────────────────────────────────────────┤
│  signatures: [Signature, ...]     // Qui autorise?          │
│                                                              │
│  message: {                                                  │
│    header: {                                                 │
│      num_required_signatures: u8                             │
│      num_readonly_signed: u8                                 │
│      num_readonly_unsigned: u8                               │
│    }                                                         │
│                                                              │
│    account_keys: [Pubkey, ...]   // Tous les comptes        │
│                                                              │
│    recent_blockhash: Hash        // Anti-replay             │
│                                                              │
│    instructions: [                                           │
│      {                                                       │
│        program_id_index: u8,     // Quel programme?         │
│        accounts: [u8, ...],      // Indices des comptes     │
│        data: [u8, ...]           // Données custom          │
│      },                                                      │
│      ...                                                     │
│    ]                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘`,
            },
            {
              type: 'concept',
              title: 'Construction avec @solana/kit',
              text: `Le nouveau \`@solana/kit\` (2025+) simplifie la création de transactions:

\`\`\`typescript
import {
  createTransaction,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransaction
} from "@solana/kit";

// 1. Créer le message
const message = createTransactionMessage({ version: 0 });

// 2. Ajouter les instructions
const withIx = appendTransactionMessageInstruction(
  yourInstruction,
  message
);

// 3. Signer
const signed = await signTransactionMessageWithSigners(withIx);

// 4. Envoyer
const signature = await sendAndConfirmTransaction(rpc, signed);
\`\`\``,
            },
            {
              type: 'note',
              variant: 'info',
              text: `ℹ️ **Limite**: Une transaction a max 1232 bytes. Pour les opérations complexes, utilise plusieurs transactions ou les Address Lookup Tables (ALT).`,
            },
          ],
        },
        exercise: {
          type: 'quiz',
          title: 'Check Your Understanding',
          questions: [
            {
              q: 'Que se passe-t-il si une instruction échoue dans une transaction?',
              options: [
                'Seule cette instruction est annulée',
                'Toute la transaction est annulée',
                'Les instructions précédentes sont gardées',
                'Le programme décide',
              ],
              correct: 1,
              explanation:
                'Les transactions Solana sont **atomiques**: tout réussit ou tout échoue.',
            },
            {
              q: 'Pourquoi le recent_blockhash est-il important?',
              options: [
                'Pour calculer les frais',
                'Pour identifier le validateur',
                'Pour éviter le replay des transactions',
                'Pour compresser les données',
              ],
              correct: 2,
              explanation:
                "Le blockhash expire après ~2 minutes, empêchant la réexécution d'anciennes transactions.",
            },
            {
              q: "Quelle est la taille maximum d'une transaction Solana?",
              options: ['512 bytes', '1232 bytes', '10 KB', 'Illimitée'],
              correct: 1,
              explanation:
                '1232 bytes max. Utilisez les Address Lookup Tables pour les transactions complexes.',
            },
          ],
        },
        resources: [
          { type: 'docs', title: 'Transactions', url: 'https://solana.com/docs/core/transactions' },
        ],
      },
      {
        id: 'sf-4',
        title: 'Quiz Final - Solana Fundamentals',
        duration: '10 min',
        xp: 150,
        type: 'quiz',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Teste tes connaissances sur les fondamentaux Solana. Tu dois obtenir **66% ou plus** pour compléter ce module.`,
            },
          ],
        },
        quiz: {
          passingScore: 0.66,
          questions: [
            {
              q: "Quel mécanisme Solana utilise-t-il pour prouver l'ordre des événements?",
              options: [
                'Proof of Work',
                'Proof of Stake',
                'Proof of History',
                'Proof of Authority',
              ],
              correct: 2,
            },
            {
              q: 'Un programme Solana peut-il stocker des données en lui-même?',
              options: [
                'Oui, dans sa mémoire',
                'Non, il utilise des comptes de données séparés',
                "Seulement jusqu'à 1KB",
                'Seulement avec un PDA',
              ],
              correct: 1,
            },
            {
              q: 'Qui peut signer pour une PDA?',
              options: [
                "Le wallet qui l'a créée",
                "N'importe qui avec les seeds",
                "Uniquement le programme qui l'a dérivée",
                'Le validateur du bloc',
              ],
              correct: 2,
            },
            {
              q: 'Combien coûte approximativement le stockage de 1KB on-chain (rent-exempt)?',
              options: ['0.0001 SOL', '0.007 SOL', '0.1 SOL', '1 SOL'],
              correct: 1,
            },
            {
              q: "Quelle innovation permet à Solana d'exécuter les transactions en parallèle?",
              options: ['Tower BFT', 'Gulf Stream', 'Sealevel', 'Turbine'],
              correct: 2,
            },
            {
              q: 'Un "owner" de compte peut:',
              options: [
                'Seulement lire les données',
                'Modifier les données et débiter les lamports',
                'Transférer la propriété',
                'Toutes ces réponses',
              ],
              correct: 1,
            },
          ],
        },
      },
    ],
  },

  'anchor-framework': {
    id: 'anchor-framework',
    title: 'Anchor Framework',
    description: 'Développe des programmes Solana avec le framework Anchor.',
    track: 'dev',
    xpReward: 800,
    prerequisites: ['solana-fundamentals'],
    lessons: [
      {
        id: 'af-1',
        title: 'Introduction à Anchor',
        duration: '20 min',
        xp: 100,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `**Anchor** est le framework standard pour développer des programmes Solana en Rust. Il abstrait la complexité des sérialisations et validations.`,
            },
            {
              type: 'diagram',
              title: 'Anchor vs Raw Solana',
              content: `
Sans Anchor (Raw):
┌─────────────────────────────────────┐
│  • Sérialisation manuelle Borsh    │
│  • Validation des comptes manuelle │
│  • 500+ lignes pour un programme   │
│  • Gestion d'erreurs complexe      │
│  • Tests difficiles                │
└─────────────────────────────────────┘

Avec Anchor:
┌─────────────────────────────────────┐
│  • Sérialisation automatique       │
│  • Macros de validation            │
│  • 50 lignes pour le même programme│
│  • Erreurs typées                  │
│  • Framework de test intégré       │
└─────────────────────────────────────┘`,
            },
            {
              type: 'concept',
              title: "Structure d'un Programme Anchor",
              text: `\`\`\`rust
use anchor_lang::prelude::*;

declare_id!("YourProgramId...");

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.data = 0;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8)]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct MyAccount {
    pub data: u64,
}
\`\`\``,
            },
            {
              type: 'note',
              variant: 'tip',
              text: `💡 Le \`8 + 8\` dans \`space\` = 8 bytes discriminator + 8 bytes pour u64. Anchor ajoute toujours 8 bytes de discriminator.`,
            },
          ],
        },
        resources: [
          {
            type: 'docs',
            title: 'Anchor Book',
            url: 'https://www.anchor-lang.com/docs/high-level-overview',
          },
          {
            type: 'video',
            title: 'Anchor Tutorial',
            url: 'https://www.youtube.com/watch?v=oD5WbRPZrZk',
          },
        ],
      },
      {
        id: 'af-2',
        title: 'Contraintes de Comptes',
        duration: '25 min',
        xp: 150,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Les **contraintes** Anchor valident automatiquement les comptes avant l'exécution. C'est la clé de la sécurité.`,
            },
            {
              type: 'concept',
              title: 'Contraintes Essentielles',
              text: `\`\`\`rust
#[derive(Accounts)]
pub struct Update<'info> {
    // init: créer le compte
    #[account(init, payer = user, space = 8 + 32)]
    pub new_account: Account<'info, MyData>,

    // mut: le compte sera modifié
    #[account(mut)]
    pub my_account: Account<'info, MyData>,

    // seeds + bump: valider une PDA
    #[account(
        seeds = [b"config", user.key().as_ref()],
        bump
    )]
    pub config_pda: Account<'info, Config>,

    // has_one: relation entre comptes
    #[account(has_one = owner)]
    pub owned_account: Account<'info, OwnedData>,

    // constraint: validation custom
    #[account(constraint = amount > 0 @ MyError::InvalidAmount)]
    pub token_account: Account<'info, TokenAccount>,

    pub owner: Signer<'info>,
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
\`\`\``,
            },
            {
              type: 'diagram',
              title: 'Cheatsheet Contraintes',
              content: `
┌──────────────────┬────────────────────────────────────────┐
│ Contrainte       │ Usage                                  │
├──────────────────┼────────────────────────────────────────┤
│ init             │ Créer un nouveau compte                │
│ mut              │ Le compte sera modifié                 │
│ seeds + bump     │ Valider/créer une PDA                  │
│ has_one = X      │ account.X == X.key()                   │
│ constraint = ... │ Condition custom (bool)                │
│ close = dest     │ Fermer le compte, envoyer à dest       │
│ realloc          │ Redimensionner les données             │
└──────────────────┴────────────────────────────────────────┘`,
            },
            {
              type: 'note',
              variant: 'warning',
              text: `⚠️ **Oubli fréquent**: Si un compte doit être modifié, ajoute toujours \`#[account(mut)]\`. Sans ça, les changements ne seront pas persistés!`,
            },
          ],
        },
        exercise: {
          type: 'code',
          title: 'Définir les Contraintes',
          instructions: `Complète les contraintes pour cette structure de comptes:
- \`vault\` est une PDA avec seeds ["vault", user.key]
- \`user_account\` appartient à \`user\` (has_one)
- Le \`user\` doit payer pour créer le vault`,
          starterCode: `#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(
        init,
        payer = ???,
        space = 8 + 32,
        seeds = [???],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(???)]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}`,
          solution: `payer = user, seeds = [b"vault", user.key().as_ref()], has_one = user`,
          hints: [
            'Le payer est celui qui signe et paie les frais',
            'Les seeds doivent inclure un préfixe string et la clé user',
            'has_one vérifie que user_account.user == user.key()',
          ],
        },
      },
      {
        id: 'af-3',
        title: 'Instructions & Context',
        duration: '22 min',
        xp: 150,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Les **instructions** sont les fonctions publiques de votre programme. Le \`Context\` donne accès aux comptes validés.`,
            },
            {
              type: 'concept',
              title: 'Pattern Standard',
              text: `\`\`\`rust
#[program]
pub mod my_program {
    use super::*;

    // Instruction: prend un Context + des arguments optionnels
    pub fn transfer_tokens(
        ctx: Context<Transfer>,
        amount: u64
    ) -> Result<()> {
        // 1. Accéder aux comptes via ctx.accounts
        let from = &mut ctx.accounts.from;
        let to = &mut ctx.accounts.to;

        // 2. Logique métier
        require!(from.balance >= amount, MyError::InsufficientFunds);

        from.balance -= amount;
        to.balance += amount;

        // 3. Émettre un événement (optionnel)
        emit!(TransferEvent {
            from: from.key(),
            to: to.key(),
            amount,
        });

        Ok(())
    }
}

// Événement pour les logs
#[event]
pub struct TransferEvent {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
}
\`\`\``,
            },
            {
              type: 'concept',
              title: 'Cross-Program Invocation (CPI)',
              text: `Pour appeler un autre programme depuis le vôtre:

\`\`\`rust
use anchor_spl::token::{self, Transfer, Token};

pub fn transfer_spl_tokens(ctx: Context<TransferSpl>, amount: u64) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.from_token.to_account_info(),
        to: ctx.accounts.to_token.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
\`\`\``,
            },
          ],
        },
        exercise: {
          type: 'quiz',
          title: 'Vérifie ta compréhension',
          questions: [
            {
              q: 'Comment accède-t-on aux comptes dans une instruction Anchor?',
              options: [
                'Via les arguments de la fonction',
                'Via ctx.accounts',
                'Via une variable globale',
                'Via un import',
              ],
              correct: 1,
            },
            {
              q: 'Que fait la macro require!()?',
              options: [
                'Importe une dépendance',
                'Déclare une variable required',
                'Vérifie une condition et retourne une erreur si false',
                'Attend une transaction',
              ],
              correct: 2,
            },
          ],
        },
      },
      {
        id: 'af-4',
        title: 'Projet: Counter Program',
        duration: '45 min',
        xp: 400,
        type: 'project',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Mets en pratique tes connaissances en créant un **Counter** complet avec Anchor.`,
            },
            {
              type: 'concept',
              title: 'Spécifications',
              text: `Crée un programme avec:
1. **initialize**: Créer un nouveau counter initialisé à 0
2. **increment**: Augmenter le counter de 1
3. **decrement**: Diminuer le counter de 1 (minimum 0)
4. **reset**: Remettre le counter à 0 (seulement le owner)

Le compte Counter doit stocker:
- \`count: u64\` - la valeur actuelle
- \`owner: Pubkey\` - qui peut reset
- \`bump: u8\` - le bump de la PDA`,
            },
            {
              type: 'diagram',
              title: 'Structure Attendue',
              content: `
programs/counter/
├── Cargo.toml
└── src/
    └── lib.rs         <- Tout le code ici

tests/
└── counter.ts         <- Tests TypeScript

Anchor.toml            <- Config du projet`,
            },
          ],
        },
        project: {
          requirements: [
            'Rust et Anchor CLI installés',
            'Solana CLI configuré sur devnet',
            'Node.js pour les tests',
          ],
          steps: [
            {
              title: 'Setup',
              instructions: `\`\`\`bash
anchor init counter
cd counter
anchor build
\`\`\``,
            },
            {
              title: 'Implémenter lib.rs',
              instructions: `Remplace le contenu de \`programs/counter/src/lib.rs\` avec ton implémentation.`,
            },
            {
              title: 'Écrire les tests',
              instructions: `Dans \`tests/counter.ts\`, teste chaque instruction.`,
            },
            {
              title: 'Déployer sur devnet',
              instructions: `\`\`\`bash
anchor build
anchor deploy
anchor test
\`\`\``,
            },
          ],
          submission: 'github',
          rubric: [
            { criterion: 'initialize fonctionne', points: 25 },
            { criterion: 'increment/decrement fonctionnent', points: 25 },
            { criterion: 'reset vérifie le owner', points: 25 },
            { criterion: 'Tests passent', points: 25 },
          ],
        },
      },
    ],
  },

  'spl-tokens': {
    id: 'spl-tokens',
    title: 'SPL Tokens',
    description: 'Maîtrise la création et gestion de tokens sur Solana.',
    track: 'dev',
    xpReward: 600,
    prerequisites: ['anchor-framework'],
    lessons: [
      {
        id: 'spl-1',
        title: 'Le Token Program',
        duration: '20 min',
        xp: 100,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Le **SPL Token Program** est le standard pour tous les tokens sur Solana - fungibles et NFTs.`,
            },
            {
              type: 'diagram',
              title: 'Architecture Token',
              content: `
┌─────────────────────────────────────────────────────────────┐
│                       TOKEN ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────┐                                      │
│   │      MINT        │  ← Définit le token                  │
│   │  ──────────────  │                                      │
│   │  supply: 1M      │                                      │
│   │  decimals: 9     │                                      │
│   │  mint_auth: 🔑   │                                      │
│   │  freeze_auth: 🔑 │                                      │
│   └────────┬─────────┘                                      │
│            │                                                 │
│            ▼                                                 │
│   ┌──────────────────┐  ┌──────────────────┐                │
│   │  TOKEN ACCOUNT   │  │  TOKEN ACCOUNT   │  ...           │
│   │  ──────────────  │  │  ──────────────  │                │
│   │  mint: ↑         │  │  mint: ↑         │                │
│   │  owner: Alice    │  │  owner: Bob      │                │
│   │  amount: 500K    │  │  amount: 300K    │                │
│   └──────────────────┘  └──────────────────┘                │
│                                                              │
│   ┌──────────────────┐                                      │
│   │  ATA (Associated)│  ← Adresse déterministe              │
│   │  Token Account   │    pour wallet + mint                │
│   └──────────────────┘                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘`,
            },
            {
              type: 'concept',
              title: 'Mint vs Token Account',
              text: `| Compte | Rôle | Qui le crée |
|--------|------|-------------|
| **Mint** | Définit le token (supply, decimals) | Le créateur du token |
| **Token Account** | Détient un solde pour un owner | Créé par l'owner ou via ATA |
| **ATA** | Token Account à adresse déterministe | Automatique avec getOrCreateATA |

**ATA = Associated Token Account**: Une adresse calculable pour (wallet, mint), évite les doublons.`,
            },
            {
              type: 'note',
              variant: 'tip',
              text: `💡 Utilise toujours les ATAs sauf besoin spécifique. C'est le standard que les wallets et explorers comprennent.`,
            },
          ],
        },
        resources: [{ type: 'docs', title: 'SPL Token Docs', url: 'https://spl.solana.com/token' }],
      },
      {
        id: 'spl-2',
        title: 'Créer un Token',
        duration: '25 min',
        xp: 150,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Créons un token avec metadata en utilisant \`@solana/kit\` (moderne) ou les outils CLI.`,
            },
            {
              type: 'concept',
              title: 'Via CLI (Simple)',
              text: `\`\`\`bash
# 1. Créer le mint
spl-token create-token --decimals 9

# Output: Creating token 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# 2. Créer un token account
spl-token create-account 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# 3. Mint des tokens
spl-token mint 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 1000000

# 4. Vérifier
spl-token balance 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
\`\`\``,
            },
            {
              type: 'concept',
              title: 'Via Code (Complet)',
              text: `\`\`\`typescript
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";

async function createMyToken() {
  const connection = new Connection(clusterApiUrl("devnet"));
  const payer = Keypair.generate(); // ou depuis un fichier

  // 1. Créer le mint
  const mint = await createMint(
    connection,
    payer,           // Payer
    payer.publicKey, // Mint authority
    payer.publicKey, // Freeze authority (null si pas besoin)
    9                // Decimals
  );

  console.log("Mint créé:", mint.toBase58());

  // 2. Créer un ATA pour recevoir
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  // 3. Mint des tokens
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,            // Mint authority
    1_000_000_000n    // 1 token (avec 9 decimals)
  );
}
\`\`\``,
            },
          ],
        },
        exercise: {
          type: 'project-mini',
          title: 'Crée ton token sur devnet',
          instructions: `Utilise la CLI pour:
1. Créer un token avec 6 decimals
2. Mint 100 tokens vers ton wallet
3. Note l'adresse du mint`,
          verification: "Colle l'adresse de ton mint ci-dessous pour vérification",
          validationPattern: '^[1-9A-HJ-NP-Za-km-z]{32,44}$',
        },
      },
      {
        id: 'spl-3',
        title: 'Transfers & Burns',
        duration: '20 min',
        xp: 150,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Le **burn** est au cœur de l'écosystème ASDF. Apprenons les opérations de transfer et burn.`,
            },
            {
              type: 'concept',
              title: 'Transfer de Tokens',
              text: `\`\`\`typescript
import { transfer, getAssociatedTokenAddress } from "@solana/spl-token";

async function transferTokens(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  destination: PublicKey,
  amount: bigint
) {
  // Trouver les ATAs
  const fromAta = await getAssociatedTokenAddress(mint, payer.publicKey);
  const toAta = await getAssociatedTokenAddress(mint, destination);

  // Transfer
  const sig = await transfer(
    connection,
    payer,
    fromAta,
    toAta,
    payer,    // Owner du fromAta
    amount
  );

  console.log("Transfer signature:", sig);
}
\`\`\``,
            },
            {
              type: 'concept',
              title: 'Burn de Tokens',
              text: `\`\`\`typescript
import { burn } from "@solana/spl-token";

async function burnTokens(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  amount: bigint
) {
  const ata = await getAssociatedTokenAddress(mint, payer.publicKey);

  // Burn - réduit la supply totale
  const sig = await burn(
    connection,
    payer,
    ata,
    mint,
    payer,    // Owner du token account
    amount
  );

  console.log("🔥 Burned!", sig);
}
\`\`\``,
            },
            {
              type: 'diagram',
              title: 'Transfer vs Burn',
              content: `
TRANSFER:
  From ATA ──────────────► To ATA
  balance -= amount       balance += amount

  Supply totale: INCHANGÉE


BURN:
  From ATA ──────────────► 🔥 VOID
  balance -= amount

  Supply totale: RÉDUITE


🔥 ASDF BURN ENGINE:
  Burn automatique sur chaque transaction
  ┌──────────────────────────────────────┐
  │  amount_received = amount * (1 - τ)  │
  │  burned = amount * τ                 │
  │  τ ≈ 3% (configurable)               │
  └──────────────────────────────────────┘`,
            },
          ],
        },
      },
    ],
  },

  'game-fundamentals': {
    id: 'game-fundamentals',
    title: 'Game Dev Fundamentals',
    description: 'Les bases du développement de jeux browser.',
    track: 'games',
    xpReward: 400,
    lessons: [
      {
        id: 'gf-1',
        title: 'Canvas & Game Loop',
        duration: '25 min',
        xp: 100,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Tout jeu browser repose sur deux concepts: le **Canvas** pour le rendu et la **Game Loop** pour la logique.`,
            },
            {
              type: 'concept',
              title: 'Le Canvas HTML5',
              text: `\`\`\`html
<canvas id="game" width="800" height="600"></canvas>

<script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Dessiner un rectangle
ctx.fillStyle = '#ff6600';
ctx.fillRect(100, 100, 50, 50);

// Dessiner un cercle
ctx.beginPath();
ctx.arc(200, 200, 30, 0, Math.PI * 2);
ctx.fill();

// Dessiner du texte
ctx.font = '24px Arial';
ctx.fillText('Score: 100', 10, 30);
</script>
\`\`\``,
            },
            {
              type: 'concept',
              title: 'Game Loop avec Delta Time',
              text: `\`\`\`javascript
class Game {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.lastTime = 0;
    this.running = false;
  }

  start() {
    this.running = true;
    requestAnimationFrame(this.loop.bind(this));
  }

  loop(currentTime) {
    if (!this.running) return;

    // Delta time en secondes
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Éviter les gros sauts (tab inactif)
    const dt = Math.min(deltaTime, 0.1);

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    // Logique du jeu
    // player.x += player.speed * dt;
  }

  render() {
    // Effacer et redessiner
    this.ctx.clearRect(0, 0, 800, 600);
    // ... dessiner les objets
  }
}
\`\`\``,
            },
            {
              type: 'note',
              variant: 'tip',
              text: `💡 **Delta Time**: Toujours multiplier les mouvements par \`dt\`. Ça garantit une vitesse constante peu importe le framerate (60fps ou 144fps).`,
            },
          ],
        },
        exercise: {
          type: 'code',
          title: 'Créer une Game Loop',
          instructions: `Complète la game loop pour faire rebondir une balle:`,
          starterCode: `class Ball {
  constructor() {
    this.x = 400;
    this.y = 300;
    this.vx = 200; // pixels par seconde
    this.vy = 150;
    this.radius = 20;
  }

  update(dt) {
    // TODO: Mettre à jour x et y avec dt
    // TODO: Rebondir sur les bords (0-800 x, 0-600 y)

  }
}`,
          solution: `this.x += this.vx * dt; this.y += this.vy * dt; if (this.x < 0 || this.x > 800) this.vx *= -1; if (this.y < 0 || this.y > 600) this.vy *= -1;`,
          hints: [
            'Position = position + velocity * deltaTime',
            'Inverser la vélocité quand on touche un bord',
          ],
        },
      },
      {
        id: 'gf-2',
        title: 'Input & Collisions',
        duration: '25 min',
        xp: 150,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `Un jeu doit répondre aux inputs et détecter les collisions entre objets.`,
            },
            {
              type: 'concept',
              title: 'Gestion des Inputs',
              text: `\`\`\`javascript
class InputManager {
  constructor() {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };

    window.addEventListener('keydown', e => {
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', e => {
      this.keys.delete(e.code);
    });

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
  }

  isPressed(keyCode) {
    return this.keys.has(keyCode);
  }
}

// Usage dans update()
if (input.isPressed('ArrowLeft')) player.x -= speed * dt;
if (input.isPressed('ArrowRight')) player.x += speed * dt;
if (input.isPressed('Space')) player.jump();
\`\`\``,
            },
            {
              type: 'concept',
              title: 'Collision Detection',
              text: `\`\`\`javascript
// Rectangle vs Rectangle (AABB)
function rectCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// Cercle vs Cercle
function circleCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < a.radius + b.radius;
}

// Point dans Rectangle
function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.width &&
         py >= rect.y && py <= rect.y + rect.height;
}
\`\`\``,
            },
            {
              type: 'diagram',
              title: 'AABB Collision',
              content: `
     A                    B
  ┌─────┐              ┌─────┐
  │     │              │     │
  │     │              │     │
  └─────┘              └─────┘

  Pas de collision: A.right < B.left


     A
  ┌─────┐
  │  ┌──┼──┐ B
  │  │░░│  │
  └──┼──┘  │
     └─────┘

  Collision! Zone grise = overlap`,
            },
          ],
        },
      },
    ],
  },

  'content-fundamentals': {
    id: 'content-fundamentals',
    title: 'Content Fundamentals',
    description: 'Les bases de la création de contenu pour crypto.',
    track: 'content',
    xpReward: 300,
    lessons: [
      {
        id: 'cf-1',
        title: 'Écrire pour Crypto',
        duration: '20 min',
        xp: 100,
        type: 'lesson',
        content: {
          sections: [
            {
              type: 'intro',
              text: `L'audience crypto a des attentes spécifiques. Apprenons à communiquer efficacement.`,
            },
            {
              type: 'concept',
              title: 'Principes Clés',
              text: `| Principe | Application |
|----------|-------------|
| **DYOR** | Toujours encourager la recherche personnelle |
| **NFA** | Jamais de conseil financier direct |
| **Transparence** | Déclarer les conflits d'intérêt |
| **Précision** | Vérifier les faits, citer les sources |
| **Accessibilité** | Expliquer le jargon pour les débutants |`,
            },
            {
              type: 'concept',
              title: "Structure d'un Thread Twitter",
              text: `\`\`\`
1/ 🧵 Hook accrocheur (question, stat choc)

2/ Contexte du problème

3-5/ Développement avec preuves

6/ Call-to-action ou conclusion

7/ "If you found this useful..."
   - RT le premier tweet
   - Follow pour plus
\`\`\`

**Formule magique**: Hook → Problem → Solution → Proof → CTA`,
            },
            {
              type: 'note',
              variant: 'warning',
              text: `⚠️ **Attention**: Ne promets jamais de gains. "Not financial advice" n'est pas une protection légale suffisante si tu fais des claims spécifiques.`,
            },
          ],
        },
        exercise: {
          type: 'creative',
          title: 'Rédige un Thread',
          instructions: `Écris un thread de 5 tweets expliquant ce qu'est le burn mechanism d'ASDF.

Critères:
- Hook accrocheur
- Explication claire du burn
- Un visuel/diagramme décrit
- Call-to-action`,
          rubric: [
            { criterion: 'Hook engageant', points: 20 },
            { criterion: 'Explication claire', points: 30 },
            { criterion: 'Ton approprié (pas de hype)', points: 25 },
            { criterion: 'CTA pertinent', points: 25 },
          ],
        },
      },
    ],
  },
};

/**
 * Helper pour obtenir un cours par ID
 */
export function getCourse(courseId) {
  return COURSES[courseId] || null;
}

/**
 * Helper pour obtenir les cours d'un track
 */
export function getCoursesByTrack(trackId) {
  return Object.values(COURSES).filter(c => c.track === trackId);
}

/**
 * Helper pour vérifier les prérequis
 */
export function checkPrerequisites(courseId, completedCourses) {
  const course = COURSES[courseId];
  if (!course || !course.prerequisites) return true;
  return course.prerequisites.every(prereq => completedCourses.includes(prereq));
}

export default COURSES;
