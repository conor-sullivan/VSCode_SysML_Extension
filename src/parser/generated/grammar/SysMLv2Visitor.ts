// Generated from SysMLv2.g4 by ANTLR 4.13.2

import {ParseTreeVisitor} from 'antlr4';

import { OwnedExpressionContext } from "./SysMLv2";
import { TypeReferenceContext } from "./SysMLv2";
import { SequenceExpressionListContext } from "./SysMLv2";
import { BaseExpressionContext } from "./SysMLv2";
import { NullExpressionContext } from "./SysMLv2";
import { FeatureReferenceExpressionContext } from "./SysMLv2";
import { MetadataAccessExpressionContext } from "./SysMLv2";
import { InvocationExpressionContext } from "./SysMLv2";
import { ConstructorExpressionContext } from "./SysMLv2";
import { BodyExpressionContext } from "./SysMLv2";
import { ArgumentListContext } from "./SysMLv2";
import { PositionalArgumentListContext } from "./SysMLv2";
import { NamedArgumentListContext } from "./SysMLv2";
import { NamedArgumentContext } from "./SysMLv2";
import { LiteralExpressionContext } from "./SysMLv2";
import { LiteralBooleanContext } from "./SysMLv2";
import { LiteralStringContext } from "./SysMLv2";
import { LiteralIntegerContext } from "./SysMLv2";
import { LiteralRealContext } from "./SysMLv2";
import { LiteralInfinityContext } from "./SysMLv2";
import { ArgumentMemberContext } from "./SysMLv2";
import { ArgumentExpressionMemberContext } from "./SysMLv2";
import { NameContext } from "./SysMLv2";
import { IdentificationContext } from "./SysMLv2";
import { RelationshipBodyContext } from "./SysMLv2";
import { RelationshipOwnedElementContext } from "./SysMLv2";
import { OwnedRelatedElementContext } from "./SysMLv2";
import { DependencyContext } from "./SysMLv2";
import { AnnotationContext } from "./SysMLv2";
import { OwnedAnnotationContext } from "./SysMLv2";
import { AnnotatingElementContext } from "./SysMLv2";
import { CommentContext } from "./SysMLv2";
import { DocumentationContext } from "./SysMLv2";
import { TextualRepresentationContext } from "./SysMLv2";
import { RootNamespaceContext } from "./SysMLv2";
import { NamespaceContext } from "./SysMLv2";
import { NamespaceDeclarationContext } from "./SysMLv2";
import { NamespaceBodyContext } from "./SysMLv2";
import { NamespaceBodyElementContext } from "./SysMLv2";
import { MemberPrefixContext } from "./SysMLv2";
import { VisibilityIndicatorContext } from "./SysMLv2";
import { NamespaceMemberContext } from "./SysMLv2";
import { NonFeatureMemberContext } from "./SysMLv2";
import { NamespaceFeatureMemberContext } from "./SysMLv2";
import { AliasMemberContext } from "./SysMLv2";
import { QualifiedNameContext } from "./SysMLv2";
import { ImportRuleContext } from "./SysMLv2";
import { ImportDeclarationContext } from "./SysMLv2";
import { MembershipImportContext } from "./SysMLv2";
import { NamespaceImportContext } from "./SysMLv2";
import { FilterPackageContext } from "./SysMLv2";
import { FilterPackageMemberContext } from "./SysMLv2";
import { MemberElementContext } from "./SysMLv2";
import { NonFeatureElementContext } from "./SysMLv2";
import { FeatureElementContext } from "./SysMLv2";
import { TypeContext } from "./SysMLv2";
import { TypePrefixContext } from "./SysMLv2";
import { TypeDeclarationContext } from "./SysMLv2";
import { SpecializationPartContext } from "./SysMLv2";
import { ConjugationPartContext } from "./SysMLv2";
import { TypeRelationshipPartContext } from "./SysMLv2";
import { DisjoiningPartContext } from "./SysMLv2";
import { UnioningPartContext } from "./SysMLv2";
import { IntersectingPartContext } from "./SysMLv2";
import { DifferencingPartContext } from "./SysMLv2";
import { TypeBodyContext } from "./SysMLv2";
import { TypeBodyElementContext } from "./SysMLv2";
import { SpecializationContext } from "./SysMLv2";
import { OwnedSpecializationContext } from "./SysMLv2";
import { SpecificTypeContext } from "./SysMLv2";
import { GeneralTypeContext } from "./SysMLv2";
import { ConjugationContext } from "./SysMLv2";
import { OwnedConjugationContext } from "./SysMLv2";
import { DisjoiningContext } from "./SysMLv2";
import { OwnedDisjoiningContext } from "./SysMLv2";
import { UnioningContext } from "./SysMLv2";
import { IntersectingContext } from "./SysMLv2";
import { DifferencingContext } from "./SysMLv2";
import { FeatureMemberContext } from "./SysMLv2";
import { TypeFeatureMemberContext } from "./SysMLv2";
import { OwnedFeatureMemberContext } from "./SysMLv2";
import { ClassifierContext } from "./SysMLv2";
import { ClassifierDeclarationContext } from "./SysMLv2";
import { SuperclassingPartContext } from "./SysMLv2";
import { SubclassificationContext } from "./SysMLv2";
import { OwnedSubclassificationContext } from "./SysMLv2";
import { FeatureContext } from "./SysMLv2";
import { EndFeaturePrefixContext } from "./SysMLv2";
import { BasicFeaturePrefixContext } from "./SysMLv2";
import { FeaturePrefixContext } from "./SysMLv2";
import { OwnedCrossFeatureMemberContext } from "./SysMLv2";
import { OwnedCrossFeatureContext } from "./SysMLv2";
import { FeatureDirectionContext } from "./SysMLv2";
import { FeatureDeclarationContext } from "./SysMLv2";
import { FeatureIdentificationContext } from "./SysMLv2";
import { FeatureRelationshipPartContext } from "./SysMLv2";
import { ChainingPartContext } from "./SysMLv2";
import { InvertingPartContext } from "./SysMLv2";
import { TypeFeaturingPartContext } from "./SysMLv2";
import { FeatureSpecializationPartContext } from "./SysMLv2";
import { MultiplicityPartContext } from "./SysMLv2";
import { FeatureSpecializationContext } from "./SysMLv2";
import { TypingsContext } from "./SysMLv2";
import { TypedByContext } from "./SysMLv2";
import { SubsettingsContext } from "./SysMLv2";
import { SubsetsContext } from "./SysMLv2";
import { ReferencesContext } from "./SysMLv2";
import { CrossesContext } from "./SysMLv2";
import { RedefinitionsContext } from "./SysMLv2";
import { RedefinesContext } from "./SysMLv2";
import { FeatureTypingContext } from "./SysMLv2";
import { OwnedFeatureTypingContext } from "./SysMLv2";
import { SubsettingContext } from "./SysMLv2";
import { OwnedSubsettingContext } from "./SysMLv2";
import { OwnedReferenceSubsettingContext } from "./SysMLv2";
import { OwnedCrossSubsettingContext } from "./SysMLv2";
import { RedefinitionContext } from "./SysMLv2";
import { OwnedRedefinitionContext } from "./SysMLv2";
import { OwnedFeatureChainContext } from "./SysMLv2";
import { FeatureChainContext } from "./SysMLv2";
import { OwnedFeatureChainingContext } from "./SysMLv2";
import { FeatureInvertingContext } from "./SysMLv2";
import { OwnedFeatureInvertingContext } from "./SysMLv2";
import { TypeFeaturingContext } from "./SysMLv2";
import { OwnedTypeFeaturingContext } from "./SysMLv2";
import { DataTypeContext } from "./SysMLv2";
import { ClassContext } from "./SysMLv2";
import { StructureContext } from "./SysMLv2";
import { AssociationContext } from "./SysMLv2";
import { AssociationStructureContext } from "./SysMLv2";
import { ConnectorContext } from "./SysMLv2";
import { ConnectorDeclarationContext } from "./SysMLv2";
import { BinaryConnectorDeclarationContext } from "./SysMLv2";
import { NaryConnectorDeclarationContext } from "./SysMLv2";
import { ConnectorEndMemberContext } from "./SysMLv2";
import { ConnectorEndContext } from "./SysMLv2";
import { OwnedCrossMultiplicityMemberContext } from "./SysMLv2";
import { OwnedCrossMultiplicityContext } from "./SysMLv2";
import { BindingConnectorContext } from "./SysMLv2";
import { BindingConnectorDeclarationContext } from "./SysMLv2";
import { SuccessionContext } from "./SysMLv2";
import { SuccessionDeclarationContext } from "./SysMLv2";
import { BehaviorContext } from "./SysMLv2";
import { StepContext } from "./SysMLv2";
import { FunctionContext } from "./SysMLv2";
import { FunctionBodyContext } from "./SysMLv2";
import { FunctionBodyPartContext } from "./SysMLv2";
import { ReturnFeatureMemberContext } from "./SysMLv2";
import { ResultExpressionMemberContext } from "./SysMLv2";
import { ExpressionContext } from "./SysMLv2";
import { PredicateContext } from "./SysMLv2";
import { BooleanExpressionContext } from "./SysMLv2";
import { InvariantContext } from "./SysMLv2";
import { OwnedExpressionMemberContext } from "./SysMLv2";
import { MetadataReferenceContext } from "./SysMLv2";
import { TypeReferenceMemberContext } from "./SysMLv2";
import { TypeResultMemberContext } from "./SysMLv2";
import { ReferenceTypingContext } from "./SysMLv2";
import { EmptyResultMemberContext } from "./SysMLv2";
import { SequenceOperatorExpressionContext } from "./SysMLv2";
import { SequenceExpressionListMemberContext } from "./SysMLv2";
import { BodyArgumentMemberContext } from "./SysMLv2";
import { BodyArgumentContext } from "./SysMLv2";
import { BodyArgumentValueContext } from "./SysMLv2";
import { FunctionReferenceArgumentMemberContext } from "./SysMLv2";
import { FunctionReferenceArgumentContext } from "./SysMLv2";
import { FunctionReferenceArgumentValueContext } from "./SysMLv2";
import { FunctionReferenceExpressionContext } from "./SysMLv2";
import { FunctionReferenceMemberContext } from "./SysMLv2";
import { FunctionReferenceContext } from "./SysMLv2";
import { FeatureChainMemberContext } from "./SysMLv2";
import { OwnedFeatureChainMemberContext } from "./SysMLv2";
import { FeatureReferenceMemberContext } from "./SysMLv2";
import { FeatureReferenceContext } from "./SysMLv2";
import { ElementReferenceMemberContext } from "./SysMLv2";
import { ConstructorResultMemberContext } from "./SysMLv2";
import { ConstructorResultContext } from "./SysMLv2";
import { InstantiatedTypeMemberContext } from "./SysMLv2";
import { InstantiatedTypeReferenceContext } from "./SysMLv2";
import { NamedArgumentMemberContext } from "./SysMLv2";
import { ParameterRedefinitionContext } from "./SysMLv2";
import { ExpressionBodyMemberContext } from "./SysMLv2";
import { ExpressionBodyContext } from "./SysMLv2";
import { BooleanValueContext } from "./SysMLv2";
import { RealValueContext } from "./SysMLv2";
import { InteractionContext } from "./SysMLv2";
import { FlowContext } from "./SysMLv2";
import { SuccessionFlowContext } from "./SysMLv2";
import { FlowDeclarationContext } from "./SysMLv2";
import { PayloadFeatureMemberContext } from "./SysMLv2";
import { PayloadFeatureContext } from "./SysMLv2";
import { PayloadFeatureSpecializationPartContext } from "./SysMLv2";
import { FlowEndMemberContext } from "./SysMLv2";
import { FlowEndContext } from "./SysMLv2";
import { FlowFeatureMemberContext } from "./SysMLv2";
import { FlowFeatureContext } from "./SysMLv2";
import { FlowFeatureRedefinitionContext } from "./SysMLv2";
import { ValuePartContext } from "./SysMLv2";
import { FeatureValueContext } from "./SysMLv2";
import { MultiplicityContext } from "./SysMLv2";
import { MultiplicitySubsetContext } from "./SysMLv2";
import { MultiplicityRangeContext } from "./SysMLv2";
import { OwnedMultiplicityContext } from "./SysMLv2";
import { OwnedMultiplicityRangeContext } from "./SysMLv2";
import { MultiplicityBoundsContext } from "./SysMLv2";
import { MultiplicityExpressionMemberContext } from "./SysMLv2";
import { MetaclassContext } from "./SysMLv2";
import { PrefixMetadataAnnotationContext } from "./SysMLv2";
import { PrefixMetadataMemberContext } from "./SysMLv2";
import { PrefixMetadataFeatureContext } from "./SysMLv2";
import { MetadataFeatureContext } from "./SysMLv2";
import { MetadataFeatureDeclarationContext } from "./SysMLv2";
import { MetadataBodyContext } from "./SysMLv2";
import { MetadataBodyElementContext } from "./SysMLv2";
import { MetadataBodyFeatureMemberContext } from "./SysMLv2";
import { MetadataBodyFeatureContext } from "./SysMLv2";
import { PackageContext } from "./SysMLv2";
import { LibraryPackageContext } from "./SysMLv2";
import { PackageDeclarationContext } from "./SysMLv2";
import { PackageBodyContext } from "./SysMLv2";
import { ElementFilterMemberContext } from "./SysMLv2";
import { DependencyDeclarationContext } from "./SysMLv2";
import { AnnotatingMemberContext } from "./SysMLv2";
import { PackageBodyElementContext } from "./SysMLv2";
import { PackageMemberContext } from "./SysMLv2";
import { DefinitionElementContext } from "./SysMLv2";
import { UsageElementContext } from "./SysMLv2";
import { BasicDefinitionPrefixContext } from "./SysMLv2";
import { DefinitionExtensionKeywordContext } from "./SysMLv2";
import { DefinitionPrefixContext } from "./SysMLv2";
import { DefinitionContext } from "./SysMLv2";
import { DefinitionDeclarationContext } from "./SysMLv2";
import { DefinitionBodyContext } from "./SysMLv2";
import { DefinitionBodyItemContext } from "./SysMLv2";
import { DefinitionMemberContext } from "./SysMLv2";
import { VariantUsageMemberContext } from "./SysMLv2";
import { NonOccurrenceUsageMemberContext } from "./SysMLv2";
import { OccurrenceUsageMemberContext } from "./SysMLv2";
import { StructureUsageMemberContext } from "./SysMLv2";
import { BehaviorUsageMemberContext } from "./SysMLv2";
import { RefPrefixContext } from "./SysMLv2";
import { BasicUsagePrefixContext } from "./SysMLv2";
import { EndUsagePrefixContext } from "./SysMLv2";
import { UsageExtensionKeywordContext } from "./SysMLv2";
import { UnextendedUsagePrefixContext } from "./SysMLv2";
import { UsagePrefixContext } from "./SysMLv2";
import { UsageContext } from "./SysMLv2";
import { UsageDeclarationContext } from "./SysMLv2";
import { UsageCompletionContext } from "./SysMLv2";
import { UsageBodyContext } from "./SysMLv2";
import { DefaultReferenceUsageContext } from "./SysMLv2";
import { ReferenceUsageContext } from "./SysMLv2";
import { EndFeatureUsageContext } from "./SysMLv2";
import { VariantReferenceContext } from "./SysMLv2";
import { NonOccurrenceUsageElementContext } from "./SysMLv2";
import { OccurrenceUsageElementContext } from "./SysMLv2";
import { StructureUsageElementContext } from "./SysMLv2";
import { BehaviorUsageElementContext } from "./SysMLv2";
import { VariantUsageElementContext } from "./SysMLv2";
import { SubclassificationPartContext } from "./SysMLv2";
import { AttributeDefinitionContext } from "./SysMLv2";
import { AttributeUsageContext } from "./SysMLv2";
import { EnumerationDefinitionContext } from "./SysMLv2";
import { EnumerationBodyContext } from "./SysMLv2";
import { EnumerationUsageMemberContext } from "./SysMLv2";
import { EnumeratedValueContext } from "./SysMLv2";
import { EnumerationUsageContext } from "./SysMLv2";
import { OccurrenceDefinitionPrefixContext } from "./SysMLv2";
import { OccurrenceDefinitionContext } from "./SysMLv2";
import { IndividualDefinitionContext } from "./SysMLv2";
import { EmptyMultiplicityMemberContext } from "./SysMLv2";
import { OccurrenceUsagePrefixContext } from "./SysMLv2";
import { OccurrenceUsageContext } from "./SysMLv2";
import { IndividualUsageContext } from "./SysMLv2";
import { PortionUsageContext } from "./SysMLv2";
import { PortionKindContext } from "./SysMLv2";
import { EventOccurrenceUsageContext } from "./SysMLv2";
import { SourceSuccessionMemberContext } from "./SysMLv2";
import { SourceSuccessionContext } from "./SysMLv2";
import { SourceEndMemberContext } from "./SysMLv2";
import { SourceEndContext } from "./SysMLv2";
import { ItemDefinitionContext } from "./SysMLv2";
import { ItemUsageContext } from "./SysMLv2";
import { PartDefinitionContext } from "./SysMLv2";
import { PartUsageContext } from "./SysMLv2";
import { PortDefinitionContext } from "./SysMLv2";
import { ConjugatedPortDefinitionMemberContext } from "./SysMLv2";
import { ConjugatedPortDefinitionContext } from "./SysMLv2";
import { PortUsageContext } from "./SysMLv2";
import { ConjugatedPortTypingContext } from "./SysMLv2";
import { ConnectionDefinitionContext } from "./SysMLv2";
import { ConnectionUsageContext } from "./SysMLv2";
import { ConnectorPartContext } from "./SysMLv2";
import { BinaryConnectorPartContext } from "./SysMLv2";
import { NaryConnectorPartContext } from "./SysMLv2";
import { BindingConnectorAsUsageContext } from "./SysMLv2";
import { SuccessionAsUsageContext } from "./SysMLv2";
import { InterfaceDefinitionContext } from "./SysMLv2";
import { InterfaceBodyContext } from "./SysMLv2";
import { InterfaceBodyItemContext } from "./SysMLv2";
import { InterfaceNonOccurrenceUsageMemberContext } from "./SysMLv2";
import { InterfaceNonOccurrenceUsageElementContext } from "./SysMLv2";
import { InterfaceOccurrenceUsageMemberContext } from "./SysMLv2";
import { InterfaceOccurrenceUsageElementContext } from "./SysMLv2";
import { DefaultInterfaceEndContext } from "./SysMLv2";
import { InterfaceUsageContext } from "./SysMLv2";
import { InterfaceUsageDeclarationContext } from "./SysMLv2";
import { InterfacePartContext } from "./SysMLv2";
import { BinaryInterfacePartContext } from "./SysMLv2";
import { NaryInterfacePartContext } from "./SysMLv2";
import { InterfaceEndMemberContext } from "./SysMLv2";
import { InterfaceEndContext } from "./SysMLv2";
import { AllocationDefinitionContext } from "./SysMLv2";
import { AllocationUsageContext } from "./SysMLv2";
import { AllocationUsageDeclarationContext } from "./SysMLv2";
import { FlowDefinitionContext } from "./SysMLv2";
import { MessageContext } from "./SysMLv2";
import { MessageDeclarationContext } from "./SysMLv2";
import { MessageEventMemberContext } from "./SysMLv2";
import { MessageEventContext } from "./SysMLv2";
import { FlowUsageContext } from "./SysMLv2";
import { SuccessionFlowUsageContext } from "./SysMLv2";
import { FlowPayloadFeatureMemberContext } from "./SysMLv2";
import { FlowPayloadFeatureContext } from "./SysMLv2";
import { FlowEndSubsettingContext } from "./SysMLv2";
import { FeatureChainPrefixContext } from "./SysMLv2";
import { ActionDefinitionContext } from "./SysMLv2";
import { ActionBodyContext } from "./SysMLv2";
import { ActionBodyItemContext } from "./SysMLv2";
import { NonBehaviorBodyItemContext } from "./SysMLv2";
import { ActionBehaviorMemberContext } from "./SysMLv2";
import { InitialNodeMemberContext } from "./SysMLv2";
import { ActionNodeMemberContext } from "./SysMLv2";
import { ActionTargetSuccessionMemberContext } from "./SysMLv2";
import { GuardedSuccessionMemberContext } from "./SysMLv2";
import { ActionUsageContext } from "./SysMLv2";
import { ActionUsageDeclarationContext } from "./SysMLv2";
import { PerformActionUsageContext } from "./SysMLv2";
import { PerformActionUsageDeclarationContext } from "./SysMLv2";
import { ActionNodeContext } from "./SysMLv2";
import { ActionNodeUsageDeclarationContext } from "./SysMLv2";
import { ActionNodePrefixContext } from "./SysMLv2";
import { ControlNodeContext } from "./SysMLv2";
import { ControlNodePrefixContext } from "./SysMLv2";
import { MergeNodeContext } from "./SysMLv2";
import { DecisionNodeContext } from "./SysMLv2";
import { JoinNodeContext } from "./SysMLv2";
import { ForkNodeContext } from "./SysMLv2";
import { AcceptNodeContext } from "./SysMLv2";
import { AcceptNodeDeclarationContext } from "./SysMLv2";
import { AcceptParameterPartContext } from "./SysMLv2";
import { PayloadParameterMemberContext } from "./SysMLv2";
import { PayloadParameterContext } from "./SysMLv2";
import { TriggerValuePartContext } from "./SysMLv2";
import { TriggerFeatureValueContext } from "./SysMLv2";
import { TriggerExpressionContext } from "./SysMLv2";
import { SendNodeContext } from "./SysMLv2";
import { SendNodeDeclarationContext } from "./SysMLv2";
import { SenderReceiverPartContext } from "./SysMLv2";
import { NodeParameterMemberContext } from "./SysMLv2";
import { NodeParameterContext } from "./SysMLv2";
import { FeatureBindingContext } from "./SysMLv2";
import { EmptyParameterMemberContext } from "./SysMLv2";
import { AssignmentNodeContext } from "./SysMLv2";
import { AssignmentNodeDeclarationContext } from "./SysMLv2";
import { AssignmentTargetMemberContext } from "./SysMLv2";
import { AssignmentTargetParameterContext } from "./SysMLv2";
import { AssignmentTargetBindingContext } from "./SysMLv2";
import { TerminateNodeContext } from "./SysMLv2";
import { IfNodeContext } from "./SysMLv2";
import { ExpressionParameterMemberContext } from "./SysMLv2";
import { ActionBodyParameterMemberContext } from "./SysMLv2";
import { ActionBodyParameterContext } from "./SysMLv2";
import { IfNodeParameterMemberContext } from "./SysMLv2";
import { WhileLoopNodeContext } from "./SysMLv2";
import { ForLoopNodeContext } from "./SysMLv2";
import { ForVariableDeclarationMemberContext } from "./SysMLv2";
import { ForVariableDeclarationContext } from "./SysMLv2";
import { ActionTargetSuccessionContext } from "./SysMLv2";
import { TargetSuccessionContext } from "./SysMLv2";
import { GuardedTargetSuccessionContext } from "./SysMLv2";
import { DefaultTargetSuccessionContext } from "./SysMLv2";
import { GuardedSuccessionContext } from "./SysMLv2";
import { StateDefinitionContext } from "./SysMLv2";
import { StateDefBodyContext } from "./SysMLv2";
import { StateBodyItemContext } from "./SysMLv2";
import { EntryActionMemberContext } from "./SysMLv2";
import { DoActionMemberContext } from "./SysMLv2";
import { ExitActionMemberContext } from "./SysMLv2";
import { EntryTransitionMemberContext } from "./SysMLv2";
import { StateActionUsageContext } from "./SysMLv2";
import { StatePerformActionUsageContext } from "./SysMLv2";
import { StateAcceptActionUsageContext } from "./SysMLv2";
import { StateSendActionUsageContext } from "./SysMLv2";
import { StateAssignmentActionUsageContext } from "./SysMLv2";
import { TransitionUsageMemberContext } from "./SysMLv2";
import { TargetTransitionUsageMemberContext } from "./SysMLv2";
import { StateUsageContext } from "./SysMLv2";
import { StateUsageBodyContext } from "./SysMLv2";
import { ExhibitStateUsageContext } from "./SysMLv2";
import { TransitionUsageContext } from "./SysMLv2";
import { TargetTransitionUsageContext } from "./SysMLv2";
import { TriggerActionMemberContext } from "./SysMLv2";
import { TriggerActionContext } from "./SysMLv2";
import { GuardExpressionMemberContext } from "./SysMLv2";
import { EffectBehaviorMemberContext } from "./SysMLv2";
import { EffectBehaviorUsageContext } from "./SysMLv2";
import { TransitionPerformActionUsageContext } from "./SysMLv2";
import { TransitionAcceptActionUsageContext } from "./SysMLv2";
import { TransitionSendActionUsageContext } from "./SysMLv2";
import { TransitionAssignmentActionUsageContext } from "./SysMLv2";
import { TransitionSuccessionMemberContext } from "./SysMLv2";
import { TransitionSuccessionContext } from "./SysMLv2";
import { EmptyEndMemberContext } from "./SysMLv2";
import { CalculationDefinitionContext } from "./SysMLv2";
import { CalculationUsageContext } from "./SysMLv2";
import { CalculationBodyContext } from "./SysMLv2";
import { CalculationBodyPartContext } from "./SysMLv2";
import { CalculationBodyItemContext } from "./SysMLv2";
import { ReturnParameterMemberContext } from "./SysMLv2";
import { ConstraintDefinitionContext } from "./SysMLv2";
import { ConstraintUsageContext } from "./SysMLv2";
import { AssertConstraintUsageContext } from "./SysMLv2";
import { ConstraintUsageDeclarationContext } from "./SysMLv2";
import { RequirementDefinitionContext } from "./SysMLv2";
import { RequirementBodyContext } from "./SysMLv2";
import { RequirementBodyItemContext } from "./SysMLv2";
import { SubjectMemberContext } from "./SysMLv2";
import { SubjectUsageContext } from "./SysMLv2";
import { RequirementConstraintMemberContext } from "./SysMLv2";
import { RequirementKindContext } from "./SysMLv2";
import { RequirementConstraintUsageContext } from "./SysMLv2";
import { FramedConcernMemberContext } from "./SysMLv2";
import { FramedConcernUsageContext } from "./SysMLv2";
import { ActorMemberContext } from "./SysMLv2";
import { ActorUsageContext } from "./SysMLv2";
import { StakeholderMemberContext } from "./SysMLv2";
import { StakeholderUsageContext } from "./SysMLv2";
import { RequirementUsageContext } from "./SysMLv2";
import { SatisfyRequirementUsageContext } from "./SysMLv2";
import { SatisfactionSubjectMemberContext } from "./SysMLv2";
import { SatisfactionParameterContext } from "./SysMLv2";
import { SatisfactionFeatureValueContext } from "./SysMLv2";
import { SatisfactionReferenceExpressionContext } from "./SysMLv2";
import { ConcernDefinitionContext } from "./SysMLv2";
import { ConcernUsageContext } from "./SysMLv2";
import { CaseDefinitionContext } from "./SysMLv2";
import { CaseUsageContext } from "./SysMLv2";
import { CaseBodyContext } from "./SysMLv2";
import { CaseBodyItemContext } from "./SysMLv2";
import { ObjectiveMemberContext } from "./SysMLv2";
import { ObjectiveRequirementUsageContext } from "./SysMLv2";
import { AnalysisCaseDefinitionContext } from "./SysMLv2";
import { AnalysisCaseUsageContext } from "./SysMLv2";
import { VerificationCaseDefinitionContext } from "./SysMLv2";
import { VerificationCaseUsageContext } from "./SysMLv2";
import { RequirementVerificationMemberContext } from "./SysMLv2";
import { RequirementVerificationUsageContext } from "./SysMLv2";
import { UseCaseDefinitionContext } from "./SysMLv2";
import { UseCaseUsageContext } from "./SysMLv2";
import { IncludeUseCaseUsageContext } from "./SysMLv2";
import { ViewDefinitionContext } from "./SysMLv2";
import { ViewDefinitionBodyContext } from "./SysMLv2";
import { ViewDefinitionBodyItemContext } from "./SysMLv2";
import { ViewRenderingMemberContext } from "./SysMLv2";
import { ViewRenderingUsageContext } from "./SysMLv2";
import { ViewUsageContext } from "./SysMLv2";
import { ViewBodyContext } from "./SysMLv2";
import { ViewBodyItemContext } from "./SysMLv2";
import { ExposeContext } from "./SysMLv2";
import { MembershipExposeContext } from "./SysMLv2";
import { NamespaceExposeContext } from "./SysMLv2";
import { ViewpointDefinitionContext } from "./SysMLv2";
import { ViewpointUsageContext } from "./SysMLv2";
import { RenderingDefinitionContext } from "./SysMLv2";
import { RenderingUsageContext } from "./SysMLv2";
import { MetadataDefinitionContext } from "./SysMLv2";
import { PrefixMetadataUsageContext } from "./SysMLv2";
import { MetadataUsageContext } from "./SysMLv2";
import { MetadataUsageDeclarationContext } from "./SysMLv2";
import { MetadataBodyUsageMemberContext } from "./SysMLv2";
import { MetadataBodyUsageContext } from "./SysMLv2";
import { ExtendedDefinitionContext } from "./SysMLv2";
import { ExtendedUsageContext } from "./SysMLv2";
import { FilterPackageImportDeclarationContext } from "./SysMLv2";
import { NamespaceImportDirectContext } from "./SysMLv2";
import { CalculationUsageDeclarationContext } from "./SysMLv2";
import { EmptyActionUsageContext } from "./SysMLv2";
import { EmptyFeatureContext } from "./SysMLv2";
import { EmptyMultiplicityContext } from "./SysMLv2";
import { EmptyUsageContext } from "./SysMLv2";
import { FilterPackageImportContext } from "./SysMLv2";
import { NonFeatureChainPrimaryExpressionContext } from "./SysMLv2";
import { PortConjugationContext } from "./SysMLv2";

/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `SysMLv2`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export class SysMLv2Visitor<Result> extends ParseTreeVisitor<Result> {
    [key: string]: any;
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
}

