"""
Netflix Content Analysis Script
Analyzes Netflix content distribution across countries, content types, and time periods
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path

# Configuration
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"
DATA_FILE = DATA_DIR / "netflix_titles.csv"

# Create directories if they don't exist
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Set style for visualizations
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)


def create_sample_dataset():
    """Create a sample Netflix dataset for demonstration"""
    np.random.seed(42)

    countries = ['United States', 'United Kingdom', 'Canada', 'India', 'Japan',
                 'France', 'Germany', 'Spain', 'Mexico', 'South Korea',
                 'Brazil', 'Italy', 'Australia', 'Netherlands', 'Sweden']

    genres = ['Action', 'Comedy', 'Drama', 'Thriller', 'Animation', 'Documentary',
              'Romance', 'Horror', 'Fantasy', 'Science Fiction']

    ratings = ['G', 'PG', 'PG-13', 'R', 'TV-Y', 'TV-Y7', 'TV-14', 'TV-MA']

    n_records = 6000

    data = {
        'show_id': [f's{i:05d}' for i in range(n_records)],
        'type': np.random.choice(['Movie', 'TV Show'], n_records, p=[0.65, 0.35]),
        'title': [f'Title {i}' for i in range(n_records)],
        'director': ['Director ' + str(i % 100) for i in range(n_records)],
        'cast': ['Actor ' + str(i % 500) for i in range(n_records)],
        'country': [', '.join(np.random.choice(countries, np.random.randint(1, 4), replace=False))
                    for _ in range(n_records)],
        'date_added': pd.date_range('2015-01-01', periods=n_records, freq='h').strftime('%B %d, %Y').tolist(),
        'release_year': np.random.randint(1990, 2022, n_records),
        'rating': np.random.choice(ratings, n_records),
        'duration': [f'{np.random.randint(60, 180)} min' if i % 2 == 0 else f'{np.random.randint(1, 5)} Seasons'
                     for i in range(n_records)],
        'listed_in': [', '.join(np.random.choice(genres, np.random.randint(1, 4), replace=False))
                      for _ in range(n_records)],
        'description': ['Plot description ' + str(i) for i in range(n_records)]
    }

    df = pd.DataFrame(data)
    df.to_csv(DATA_FILE, index=False)
    print(f"Sample dataset created at {DATA_FILE}")


def load_and_clean_data():
    """Load and clean the Netflix dataset"""
    print("\nLoading dataset...")

    if not DATA_FILE.exists():
        print("No input CSV found. Generating synthetic demo data.")
        create_sample_dataset()

    df = pd.read_csv(DATA_FILE)

    # Clean data
    df = df.dropna(subset=['type', 'country', 'release_year'])

    # Convert release_year to integer
    df['release_year'] = pd.to_numeric(df['release_year'], errors='coerce')
    df = df.dropna(subset=['release_year'])
    df['release_year'] = df['release_year'].astype(int)

    print(f"Dataset loaded: {len(df)} records")
    print(f"Content types: {df['type'].unique()}")
    print(f"Date range: {df['release_year'].min()} - {df['release_year'].max()}")

    return df


def analyze_content_dominance(df):
    """Analyze global Movie vs TV Show distribution"""
    print("\n" + "="*50)
    print("ANALYSIS 1: Global Content Dominance")
    print("="*50)

    type_counts = df['type'].value_counts()
    type_percentages = df['type'].value_counts(normalize=True) * 100

    print(f"\nTotal Content: {len(df)}")
    print(f"Movies: {type_counts.get('Movie', 0)} ({type_percentages.get('Movie', 0):.1f}%)")
    print(f"TV Shows: {type_counts.get('TV Show', 0)} ({type_percentages.get('TV Show', 0):.1f}%)")

    # Create pie chart
    fig, ax = plt.subplots(figsize=(10, 8))
    colors = ['#E50914', '#221f1f']  # Netflix colors
    ax.pie(type_counts.values, labels=type_counts.index, autopct='%1.1f%%',
           startangle=90, colors=colors, textprops={'fontsize': 12, 'weight': 'bold'})
    ax.set_title('Netflix Content Distribution: Movies vs TV Shows', fontsize=14, weight='bold')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'movies_vs_shows.png', dpi=300, bbox_inches='tight')
    plt.close()

    return {
        'total': len(df),
        'movies': type_counts.get('Movie', 0),
        'tv_shows': type_counts.get('TV Show', 0),
        'movie_percentage': type_percentages.get('Movie', 0),
        'tv_percentage': type_percentages.get('TV Show', 0)
    }


def analyze_country_content(df):
    """Analyze content distribution by country and type"""
    print("\n" + "="*50)
    print("ANALYSIS 2: Content by Country and Type")
    print("="*50)

    # Expand country data (split multiple countries)
    country_type_data = []

    for _, row in df.iterrows():
        countries = [c.strip() for c in str(row['country']).split(',')]
        for country in countries:
            country_type_data.append({
                'country': country,
                'type': row['type']
            })

    country_df = pd.DataFrame(country_type_data)

    # Get top countries
    country_counts = country_df['country'].value_counts().head(15)

    print(f"\nTop 15 Countries by Content Count:")
    for i, (country, count) in enumerate(country_counts.items(), 1):
        print(f"{i:2d}. {country}: {count}")

    # Create country-type breakdown
    country_type_pivot = country_df[country_df['country'].isin(country_counts.index)].groupby(['country', 'type']).size().unstack(fill_value=0)

    # Reorder by total count
    country_type_pivot['Total'] = country_type_pivot.sum(axis=1)
    country_type_pivot = country_type_pivot.sort_values('Total', ascending=True).drop('Total', axis=1)

    # Create bar chart
    fig, ax = plt.subplots(figsize=(12, 8))
    country_type_pivot.plot(kind='barh', stacked=False, ax=ax, color=['#E50914', '#221f1f'])
    ax.set_xlabel('Content Count', fontsize=12, weight='bold')
    ax.set_ylabel('Country', fontsize=12, weight='bold')
    ax.set_title('Top 15 Countries by Content Count (Movies vs TV Shows)', fontsize=14, weight='bold')
    ax.legend(title='Content Type', loc='lower right')
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'top_countries_chart.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Save to CSV
    country_type_pivot_export = country_type_pivot.copy()
    country_type_pivot_export['Total'] = country_type_pivot_export.sum(axis=1)
    country_type_pivot_export = country_type_pivot_export.sort_values('Total', ascending=False)
    country_type_pivot_export.to_csv(OUTPUT_DIR / 'country_content_analysis.csv')

    return country_type_pivot_export


def analyze_temporal_growth(df):
    """Analyze content growth over years by type"""
    print("\n" + "="*50)
    print("ANALYSIS 3: Temporal Growth Analysis")
    print("="*50)

    # Group by year and type
    yearly_data = df.groupby(['release_year', 'type']).size().unstack(fill_value=0)

    print(f"\nContent Growth Over Years:")
    print(f"Year Range: {df['release_year'].min()} - {df['release_year'].max()}")
    print(f"\nSample Data (Last 10 years):")
    print(yearly_data.tail(10))

    # Create line chart
    fig, ax = plt.subplots(figsize=(14, 7))

    if 'Movie' in yearly_data.columns:
        ax.plot(yearly_data.index, yearly_data['Movie'], marker='o', linewidth=2.5,
                label='Movies', color='#E50914', markersize=6)
    if 'TV Show' in yearly_data.columns:
        ax.plot(yearly_data.index, yearly_data['TV Show'], marker='s', linewidth=2.5,
                label='TV Shows', color='#221f1f', markersize=6)

    ax.set_xlabel('Release Year', fontsize=12, weight='bold')
    ax.set_ylabel('Number of Titles', fontsize=12, weight='bold')
    ax.set_title('Netflix Content Growth Over Time (by Release Year)', fontsize=14, weight='bold')
    ax.legend(fontsize=11, loc='upper left')
    ax.grid(True, alpha=0.3)
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / 'growth_trends.png', dpi=300, bbox_inches='tight')
    plt.close()

    # Save to CSV
    yearly_data['Total'] = yearly_data.sum(axis=1)
    yearly_data.to_csv(OUTPUT_DIR / 'yearly_growth.csv')

    # Calculate growth rate
    if len(yearly_data) > 1:
        growth_rate = ((yearly_data['Total'].iloc[-1] - yearly_data['Total'].iloc[0]) / yearly_data['Total'].iloc[0]) * 100
        print(f"\nOverall Growth Rate: {growth_rate:.1f}%")

    return yearly_data


def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("NETFLIX CONTENT ANALYSIS")
    print("="*60)

    # Load and clean data
    df = load_and_clean_data()

    # Analysis 1: Global dominance
    dominance_stats = analyze_content_dominance(df)

    # Analysis 2: Country analysis
    country_stats = analyze_country_content(df)

    # Analysis 3: Temporal growth
    temporal_stats = analyze_temporal_growth(df)

    # Summary
    print("\n" + "="*60)
    print("ANALYSIS COMPLETE")
    print("="*60)
    print(f"\nOutput files saved to: {OUTPUT_DIR.absolute()}")
    print("\nGenerated files:")
    print("  - movies_vs_shows.png")
    print("  - top_countries_chart.png")
    print("  - growth_trends.png")
    print("  - country_content_analysis.csv")
    print("  - yearly_growth.csv")
    print("\nReady for markdown report generation!")


if __name__ == "__main__":
    main()
