<!--
SPDX-FileCopyrightText: 2026 ChallengeMyProject

SPDX-License-Identifier: AGPL-3.0-only
-->

# Tableaux responsive

Les tableaux de listing partagent une même mécanique : ils débordent
horizontalement sur petit écran, gardent leur colonne d'actions visible, et
tronquent le texte trop long. `columns.ts` fournit les largeurs et le calcul de
`scroll.x`.

## Le pattern

```tsx
const columns: TableProps<Database>["columns"] = [
  { title: t`Titre`, key: "title", dataIndex: "title", width: COL.title, ellipsis: true },
  { title: t`Statut`, key: "status", dataIndex: "status", width: COL.status,
    render: (status) => <DatabaseStatusTag status={status} /> },
  { title: "", key: "actions", align: "right", fixed: "right",
    width: actionsWidth({ icons: 3, labelled: 1 }), render: … },
];

<Table columns={columns} scroll={scrollX(columns)} … />
```

Référence complète : `src/features/databases/databases-list.tsx`.

## Pourquoi `scroll.x` est un nombre, et pas `"max-content"`

C'est le point qui casse en silence. `@rc-component/table` choisit son
`tableLayout` ainsi (`es/Table.js`, `mergedTableLayout`) :

```js
if (fixColumn) {
  return mergedScrollX === 'max-content' ? 'auto' : 'fixed';
}
```

Dès qu'une colonne est `fixed`, `scroll={{ x: "max-content" }}` retombe donc en
`table-layout: auto` : les colonnes s'étirent au contenu et **tous les
`ellipsis` cessent de tronquer**, sans erreur ni avertissement. La combinaison
« colonne figée + ellipsis » impose un `scroll.x` numérique — d'où `scrollX()`,
qui le somme depuis les `width` déclarées plutôt que de le figer à la main.

Corollaire : en `table-layout: fixed`, une colonne sans `width` se partage
l'espace restant et son ellipsis redevient imprévisible. **Toute colonne porte
une `width`**, sinon `scrollX()` la compte pour zéro et sous-estime le total.

## Où mettre l'ellipsis

`ellipsis: true` pose `overflow: hidden` + `white-space: nowrap` sur la cellule
entière. Ça ne convient donc qu'au **texte simple sur une ligne**.

| Contenu de la colonne | À faire |
|---|---|
| Texte brut (titre, email, URL, description) | `ellipsis: true` sur la colonne |
| Tag, `TagsCell`, `Select`, `UsageBar`, avatar + texte | `width` seule — l'ellipsis couperait le composant |
| Multi-lignes (`Flex vertical` titre + description) | `width` seule + `ellipsis` sur chaque `<Typography.Text>` interne |

## Largeur de la colonne d'actions

`actionsWidth({ icons, labelled })` mesure le cluster : boutons `size="small"`
en icône seule (24px), boutons avec libellé (~100px), gap de `<Space>` (8px),
padding de cellule. Quand les boutons sont conditionnels (rendus selon le
statut de la ligne), dimensionner sur le **cas maximal** — la largeur d'une
colonne est commune à toutes les lignes.

Table `expandable` : la colonne d'expansion ne figure pas dans `columns`,
l'ajouter au total via `scrollX(columns, EXPAND_COLUMN_WIDTH)`.
