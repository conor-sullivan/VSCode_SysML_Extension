# Release Checklist

Use this template when preparing a new release.

## Before Tagging

1. Update `CHANGELOG.md`:
   - Move items from `[Unreleased]` into a new `## [x.y.z]` section
   - Use subsections: `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`
2. Ensure all tests pass: `npm test`
3. Verify extension compiles: `npm run compile`
4. Test packaging locally: `npm run package`

## Creating the Release

```bash
git tag v0.15.0
git push origin v0.15.0
```

The [release workflow](../workflows/release.yml) will automatically:

- Build and package the VSIX
- Extract release notes from `CHANGELOG.md` for the tagged version
- Create a GitHub Release with the notes and VSIX attached
- Publish to the VS Code Marketplace (if token is configured)

## After Release

- Verify the [GitHub Release](https://github.com/daltskin/VSCode_SysML_Extension/releases) looks correct
- Confirm the VSIX is downloadable
- Add a new `## [Unreleased]` section to `CHANGELOG.md` if not already present
