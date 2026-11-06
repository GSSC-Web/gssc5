from strictdoc.core.project_config import ProjectConfig


def create_config() -> ProjectConfig:
    return ProjectConfig(
        project_title="GSSC Website",
        project_features=[
            # Stable features.
            "TABLE_SCREEN",
            "TRACEABILITY_SCREEN",
            "DEEP_TRACEABILITY_SCREEN",
            "SEARCH",
            "TRACEABILITY_MATRIX_SCREEN",
            "REQUIREMENT_TO_SOURCE_TRACEABILITY",
            # "MATHJAX"

            # Experimental features.
            "PROJECT_STATISTICS_SCREEN",
            "TREE_MAP_SCREEN",
            # "REQIF",
            # "HTML2PDF",
            # "DIFF",
        ],
        include_doc_paths=[
            "/docs/",
        ],
        # Include masks filter files but do not stop the startup directory
        # walk. These excludes prune third-party trees before they are scanned.
        exclude_doc_paths=[
            "node_modules/",
            ".venv/",
        ],
        include_source_paths=[
            "/src/**",
            "/gssc5-web/apps/backend/src/**",
            "/gssc5-web/apps/backend/prisma/**",
            "/gssc5-web/apps/public/src/**",
        ],
        exclude_source_paths=[
            "node_modules/",
            ".venv/",
            "**/src/generated/",
        ],
    )
