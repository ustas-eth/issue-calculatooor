# Issue Calculatooor
Makes your life easier

KenzoAgada's [GISFAC](https://github.com/KenzoAgada/gisfac) was taken as a base.

## Features
- Support of the Analysis reports
- Calculation of rewards for H/M issues

## Requirements
- NodeJS v20
- GitHub personal key with the `repo` permission - [CREATE HERE](https://github.com/settings/tokens)
- Access to C4 findings repositories

## How to run
1. Run `yarn` to install the deps
2. Create `.env`
```env
GH_API_TOKEN=ghp_yourpersonaltoken
REPO=code-423n4/some-repo-findings
HM_POT=1000000
```
3. Run `yarn start`
4. Drink a tea...
5. See a `.csv` file in the `./out` folder. It uses `;` delimiter, and you can import it into Google Spreadsheets or Excel.

## TODO
- make logs nicer

The repo is under the MIT license; feel free to use it!