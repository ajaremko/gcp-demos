import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const makeStyles = (colorScheme: 'light' | 'dark') => {
  const background = colorScheme === 'dark' ? '#111827' : '#ffffff'
  const color = colorScheme === 'dark' ? '#f9fafb' : '#111827'
  return StyleSheet.create({
    page: { padding: 40, backgroundColor: background, color },
    title: { fontSize: 20, fontWeight: 700, marginBottom: 16 },
    body: { fontSize: 12, lineHeight: 1.5 },
  })
}

export function DocumentPdf({
  colorScheme,
  title,
  body,
}: {
  colorScheme: 'light' | 'dark'
  title: string
  body: string
}) {
  const styles = makeStyles(colorScheme)
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      </Page>
    </Document>
  )
}
