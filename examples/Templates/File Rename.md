<%
// Tempater template that adds a date stamp to the filename of the current file.
//
// Usage:
// - Place in Templater's templates folder and use "Execute Templater file"
// - OR use with "Execute templater command".

tp.file.rename(tp.file.title + ' ' + tp.date.now())
%>