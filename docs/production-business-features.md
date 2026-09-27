# Business features, version 1.3 UI

Promoted from the tested Security Lab business branch onto Production main:

- Private/business category is selected in Customers, including customer edits.
- Weekly, biweekly and 30-day contracts support 1–12 total visits. Quarterly,
  six-monthly and annual contracts schedule 4, 2 and 1 visits respectively.
- Recurring appointments shift compliance dates by the same fixed-day interval.
- Completion records a paid/unpaid choice; administrators can record partial
  payments from the customer balance panel. Existing paid turnover is retained.
- Myocide and certification validate service data before asking about payment.
- Certification requires TIN and permits no AMA; business certificates omit AMA.
- Contract controls share the schedule form bounds, and UI footers display 1.3.
- Removed the explanatory legacy-turnover banners from Statistics and customer balances.

The release preserves Production API endpoints, authentication storage, app IDs,
build configuration and existing platform-specific behavior. No Lab backup or
environment settings are promoted. The backend business migration and feature
flag must be active before clients use the new APIs.

Validation includes the repository tests, production bundle export, customer
category API normalization, contract dropdown interactions, explicit payment
choices/cancellation/retries, and service-data validation before the payment
prompt. These are automated checks; store distribution and physical-device
testing are separate steps.
