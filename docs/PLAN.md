# Product and ML roadmap

## Current system

The application is deployed as a Telegram Mini App and includes wardrobe ingestion, multimodal metadata extraction, hybrid outfit recommendation, feedback, wear history and trip packing.

The recommendation path is intentionally hybrid:

1. create candidates from available wardrobe items;
2. apply weather, occasion and activity constraints;
3. rank candidates using interpretable features and feedback;
4. optionally request a structured model recommendation;
5. validate it and fall back to deterministic ranking if necessary.

## Near-term priorities

### Data quality

- Record model/prompt version and user corrections for item extraction.
- Add consent-aware anonymized event logging.
- Define stable event schemas for impressions, accepts, replacements and rejects.
- Keep real photos and user identifiers outside public datasets.

### Evaluation

- Expand the synthetic constraint suite to edge cases and adversarial catalogs.
- Build an anonymized human-rated outfit set.
- Report acceptance@k, coverage, diversity, replacement rate and fallback rate.
- Use temporal splits once enough feedback exists.

### Modeling

- Calibrate confidence for photo-derived attributes.
- Compare the current hand-tuned ranker with logistic/pairwise ranking baselines.
- Train only after collecting enough unbiased impression data.
- Keep hard safety and availability rules outside the learned model.

### Product

- Replace remaining blocking alerts with non-blocking status messages.
- Add an account-level data export and deletion flow.
- Improve trip packing explanations and duplicate control.
- Add public read-only demo mode with synthetic data.

## Definition of done

A change is complete when tests, lint, type checking and production build pass; trust-boundary inputs are validated; user data is not exposed; and new recommendation logic has at least one deterministic test.
