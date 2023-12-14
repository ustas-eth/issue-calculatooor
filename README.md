# Issue Calculatooor
Makes your life easier

KenzoAgada's [GISFAC](https://github.com/KenzoAgada/gisfac) was taken as a base.
The current version has the same problems, which I'll try to solve if needed.

## Features
- Support of the Analysis reports

## Requirements
- NodeJS v20
- GitHub personal key with the `repo` permission
- Access to C4 findings repositories

## How to run
1. Run `yarn` to install the deps
2. Create `.env`
```env
GH_API_TOKEN=ghp_yourpersonaltoken
REPO=code-423n4/some-repo-findings
```
3. Run `yarn start`
4. Drink a tea...
5. See a `.csv` file in the `./out` folder. It uses `;` delimiter, and you can import it into Google Spreadsheets or Excel.

## TODO
- make logs nicer
- fix the algo issues

The repo is under the MIT license; feel free to use it!