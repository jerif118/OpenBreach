# Report Templates

This folder contains the editable Markdown templates used to render the two PDF variants:

- `technical-report.md`
- `friendly-report.md`

The PDF renderer loads these templates at runtime, replaces the `{{placeholder}}` tokens with report data, parses the resulting Markdown, and then applies the PDF layout theme.

You can change copy, section order, section titles, and helper notes here without changing the report workflow code, as long as the placeholder names stay intact.

Current placeholder groups:

- Basic fields: `{{title}}`, `{{summary}}`, `{{municipalityName}}`, `{{municipalityId}}`, `{{audienceLabel}}`, `{{generatedAt}}`, `{{generatedBy}}`
- Ordered lists: `{{priorityActionsMarkdown}}`
- Section narratives: `{{scopeNarrative}}`, `{{authorizationNarrative}}`, `{{methodologyNarrative}}`, `{{findingsOverviewNarrative}}`, `{{skippedTestsNarrative}}`, `{{validationStatusNarrative}}`, `{{limitationsNarrative}}`, `{{remediationChecklistNarrative}}`, `{{verificationGuidanceNarrative}}`
- Section lists: `{{scopeBulletsMarkdown}}`, `{{authorizationBulletsMarkdown}}`, `{{methodologyBulletsMarkdown}}`, `{{findingsOverviewBulletsMarkdown}}`, `{{skippedTestsBulletsMarkdown}}`, `{{validationStatusBulletsMarkdown}}`, `{{limitationsBulletsMarkdown}}`, `{{remediationChecklistBulletsMarkdown}}`, `{{verificationGuidanceBulletsMarkdown}}`
- Findings body: `{{detailedFindingsMarkdown}}`
