const SAMPLE_TITLES = [
  'Freelance Services Agreement',
  'Q3 Sales Performance Report',
  'Non-Disclosure Agreement',
  'Employee Onboarding Handbook',
  'Software License Agreement',
  'Residential Lease Agreement',
  'Marketing Strategy Proposal',
  'Consulting Services Contract',
  'Annual Shareholder Letter',
  'Product Requirements Document',
] as const

const LOREM_PARAGRAPHS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam.',
  'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.',
  'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.',
  'Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.',
  'Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. Curabitur pretium tincidunt lacus, ut interdum tellus elit sed risus. Maecenas eget condimentum velit, sit amet feugiat lectus.',
  'Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Sed non neque elit. Sed ut imperdiet nisi. Proin condimentum fermentum nunc, sit amet sodales justo.',
] as const

const BODY_MAX_LENGTH = 20_000

export function randomTitle(): string {
  return SAMPLE_TITLES[Math.floor(Math.random() * SAMPLE_TITLES.length)]
}

export function randomBody(): string {
  const paragraphCount = 15 + Math.floor(Math.random() * 20) // 15-34 paragraphs
  const paragraphs = Array.from(
    { length: paragraphCount },
    () => LOREM_PARAGRAPHS[Math.floor(Math.random() * LOREM_PARAGRAPHS.length)],
  )
  return paragraphs.join('\n\n').slice(0, BODY_MAX_LENGTH)
}

export function randomColorScheme(): 'light' | 'dark' {
  return Math.random() < 0.5 ? 'light' : 'dark'
}
