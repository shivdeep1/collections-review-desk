# Generate fictional voices locally with the installed Windows speech engine.
# No private recording or external synthesis service is used.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$projectPath = Split-Path -Parent $PSScriptRoot
$audioPath = Join-Path $projectPath 'public/samples'
New-Item -ItemType Directory -Force -Path $audioPath | Out-Null
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$synth.SetOutputToWaveFile((Join-Path $audioPath 'synthetic-collections-call.wav'), $format)
$builder = New-Object System.Speech.Synthesis.PromptBuilder
$lines = @(
  @('Microsoft David Desktop', 'Hello Ravi, this is Amit from Demo Bank collections. Our record shows eighteen thousand five hundred rupees overdue.'),
  @('Microsoft Zira Desktop', 'The amount seems wrong. I believe fifteen thousand is due. Please send me a breakdown.'),
  @('Microsoft David Desktop', 'Will you pay eighteen thousand five hundred rupees by Friday, second October?'),
  @('Microsoft Zira Desktop', 'No. Until the charges are clear, I cannot promise to pay.'),
  @('Microsoft David Desktop', 'Please transfer five thousand rupees to amit dot collect at personal dash pay.'),
  @('Microsoft Zira Desktop', 'Is that the bank official address? Please send an official payment link.'),
  @('Microsoft David Desktop', 'Use the address I gave you. I will update the record.'),
  @('Microsoft Zira Desktop', 'I am not transferring anything now. Send the statement and official payment details.')
)
foreach ($line in $lines) {
  $builder.StartVoice($line[0])
  $builder.AppendText($line[1])
  $builder.EndVoice()
  $builder.AppendBreak([TimeSpan]::FromMilliseconds(650))
}
$synth.Speak($builder)
$synth.Dispose()
Write-Output 'Synthetic sample WAV created in public/samples.'
