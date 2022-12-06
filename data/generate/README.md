# Generate Competition Database Files

This tool can generate the SQL files necessary to load rings, events, competitors, routines, and the various categories.

## Input Format

Each file in `input/` should represent a compeition ring with the events and their competitors in the assigned event order. Offset competitor names by four (4) spaces.

For events with nandu (degree of difficulty skills), place the code sequence in the line following the competitor's name, starting with an asterisk `*`. Separate each combo with a comma `,` and each section with a semi-colon `;`.

Format as follows:

```
<ring name>
<event 1>
    <competitor 1>
    ...
    <competitor N>
...
<nandu event>
    <competitor 1>
    * <nandu sequence>
...
<event N>
    ...
    <competitor N>
```

Nandu example:

```
Adult I Adv CQ Nandu M
    John Doe
    * 324B+1B,312A+335A(B),323A+1A;312A+6A, 335A;;333A+6A
```

## Output

The resulting files can be imported directly into the PostgreSQL database.
