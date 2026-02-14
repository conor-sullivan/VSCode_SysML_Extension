// Generated from SysMLv2Parser.g4 by ANTLR 4.13.2

import {ParseTreeVisitor} from 'antlr4';

import { OwnedExpressionContext } from "./SysMLv2Parser";
import { TypeReferenceContext } from "./SysMLv2Parser";
import { SequenceExpressionListContext } from "./SysMLv2Parser";
import { BaseExpressionContext } from "./SysMLv2Parser";
import { NullExpressionContext } from "./SysMLv2Parser";
import { FeatureReferenceExpressionContext } from "./SysMLv2Parser";
import { MetadataAccessExpressionContext } from "./SysMLv2Parser";
import { InvocationExpressionContext } from "./SysMLv2Parser";
import { ConstructorExpressionContext } from "./SysMLv2Parser";
import { BodyExpressionContext } from "./SysMLv2Parser";
import { ArgumentListContext } from "./SysMLv2Parser";
import { PositionalArgumentListContext } from "./SysMLv2Parser";
import { NamedArgumentListContext } from "./SysMLv2Parser";
import { NamedArgumentContext } from "./SysMLv2Parser";
import { LiteralExpressionContext } from "./SysMLv2Parser";
import { LiteralBooleanContext } from "./SysMLv2Parser";
import { LiteralStringContext } from "./SysMLv2Parser";
import { LiteralIntegerContext } from "./SysMLv2Parser";
import { LiteralRealContext } from "./SysMLv2Parser";
import { LiteralInfinityContext } from "./SysMLv2Parser";
import { ArgumentMemberContext } from "./SysMLv2Parser";
import { ArgumentExpressionMemberContext } from "./SysMLv2Parser";
import { NameContext } from "./SysMLv2Parser";
import { IdentificationContext } from "./SysMLv2Parser";
import { RelationshipBodyContext } from "./SysMLv2Parser";
import { RelationshipOwnedElementContext } from "./SysMLv2Parser";
import { OwnedRelatedElementContext } from "./SysMLv2Parser";
import { DependencyContext } from "./SysMLv2Parser";
import { AnnotationContext } from "./SysMLv2Parser";
import { OwnedAnnotationContext } from "./SysMLv2Parser";
import { AnnotatingElementContext } from "./SysMLv2Parser";
import { CommentContext } from "./SysMLv2Parser";
import { DocumentationContext } from "./SysMLv2Parser";
import { TextualRepresentationContext } from "./SysMLv2Parser";
import { RootNamespaceContext } from "./SysMLv2Parser";
import { NamespaceContext } from "./SysMLv2Parser";
import { NamespaceDeclarationContext } from "./SysMLv2Parser";
import { NamespaceBodyContext } from "./SysMLv2Parser";
import { NamespaceBodyElementContext } from "./SysMLv2Parser";
import { MemberPrefixContext } from "./SysMLv2Parser";
import { VisibilityIndicatorContext } from "./SysMLv2Parser";
import { NamespaceMemberContext } from "./SysMLv2Parser";
import { NonFeatureMemberContext } from "./SysMLv2Parser";
import { NamespaceFeatureMemberContext } from "./SysMLv2Parser";
import { AliasMemberContext } from "./SysMLv2Parser";
import { QualifiedNameContext } from "./SysMLv2Parser";
import { ImportRuleContext } from "./SysMLv2Parser";
import { ImportDeclarationContext } from "./SysMLv2Parser";
import { MembershipImportContext } from "./SysMLv2Parser";
import { NamespaceImportContext } from "./SysMLv2Parser";
import { FilterPackageContext } from "./SysMLv2Parser";
import { FilterPackageMemberContext } from "./SysMLv2Parser";
import { MemberElementContext } from "./SysMLv2Parser";
import { NonFeatureElementContext } from "./SysMLv2Parser";
import { FeatureElementContext } from "./SysMLv2Parser";
import { TypeContext } from "./SysMLv2Parser";
import { TypePrefixContext } from "./SysMLv2Parser";
import { TypeDeclarationContext } from "./SysMLv2Parser";
import { SpecializationPartContext } from "./SysMLv2Parser";
import { ConjugationPartContext } from "./SysMLv2Parser";
import { TypeRelationshipPartContext } from "./SysMLv2Parser";
import { DisjoiningPartContext } from "./SysMLv2Parser";
import { UnioningPartContext } from "./SysMLv2Parser";
import { IntersectingPartContext } from "./SysMLv2Parser";
import { DifferencingPartContext } from "./SysMLv2Parser";
import { TypeBodyContext } from "./SysMLv2Parser";
import { TypeBodyElementContext } from "./SysMLv2Parser";
import { SpecializationContext } from "./SysMLv2Parser";
import { OwnedSpecializationContext } from "./SysMLv2Parser";
import { SpecificTypeContext } from "./SysMLv2Parser";
import { GeneralTypeContext } from "./SysMLv2Parser";
import { ConjugationContext } from "./SysMLv2Parser";
import { OwnedConjugationContext } from "./SysMLv2Parser";
import { DisjoiningContext } from "./SysMLv2Parser";
import { OwnedDisjoiningContext } from "./SysMLv2Parser";
import { UnioningContext } from "./SysMLv2Parser";
import { IntersectingContext } from "./SysMLv2Parser";
import { DifferencingContext } from "./SysMLv2Parser";
import { FeatureMemberContext } from "./SysMLv2Parser";
import { TypeFeatureMemberContext } from "./SysMLv2Parser";
import { OwnedFeatureMemberContext } from "./SysMLv2Parser";
import { ClassifierContext } from "./SysMLv2Parser";
import { ClassifierDeclarationContext } from "./SysMLv2Parser";
import { SuperclassingPartContext } from "./SysMLv2Parser";
import { SubclassificationContext } from "./SysMLv2Parser";
import { OwnedSubclassificationContext } from "./SysMLv2Parser";
import { FeatureContext } from "./SysMLv2Parser";
import { EndFeaturePrefixContext } from "./SysMLv2Parser";
import { BasicFeaturePrefixContext } from "./SysMLv2Parser";
import { FeaturePrefixContext } from "./SysMLv2Parser";
import { OwnedCrossFeatureMemberContext } from "./SysMLv2Parser";
import { OwnedCrossFeatureContext } from "./SysMLv2Parser";
import { FeatureDirectionContext } from "./SysMLv2Parser";
import { FeatureDeclarationContext } from "./SysMLv2Parser";
import { FeatureIdentificationContext } from "./SysMLv2Parser";
import { FeatureRelationshipPartContext } from "./SysMLv2Parser";
import { ChainingPartContext } from "./SysMLv2Parser";
import { InvertingPartContext } from "./SysMLv2Parser";
import { TypeFeaturingPartContext } from "./SysMLv2Parser";
import { FeatureSpecializationPartContext } from "./SysMLv2Parser";
import { MultiplicityPartContext } from "./SysMLv2Parser";
import { FeatureSpecializationContext } from "./SysMLv2Parser";
import { TypingsContext } from "./SysMLv2Parser";
import { TypedByContext } from "./SysMLv2Parser";
import { SubsettingsContext } from "./SysMLv2Parser";
import { SubsetsContext } from "./SysMLv2Parser";
import { ReferencesContext } from "./SysMLv2Parser";
import { CrossesContext } from "./SysMLv2Parser";
import { RedefinitionsContext } from "./SysMLv2Parser";
import { RedefinesContext } from "./SysMLv2Parser";
import { FeatureTypingContext } from "./SysMLv2Parser";
import { OwnedFeatureTypingContext } from "./SysMLv2Parser";
import { SubsettingContext } from "./SysMLv2Parser";
import { OwnedSubsettingContext } from "./SysMLv2Parser";
import { OwnedReferenceSubsettingContext } from "./SysMLv2Parser";
import { OwnedCrossSubsettingContext } from "./SysMLv2Parser";
import { RedefinitionContext } from "./SysMLv2Parser";
import { OwnedRedefinitionContext } from "./SysMLv2Parser";
import { OwnedFeatureChainContext } from "./SysMLv2Parser";
import { FeatureChainContext } from "./SysMLv2Parser";
import { OwnedFeatureChainingContext } from "./SysMLv2Parser";
import { FeatureInvertingContext } from "./SysMLv2Parser";
import { OwnedFeatureInvertingContext } from "./SysMLv2Parser";
import { TypeFeaturingContext } from "./SysMLv2Parser";
import { OwnedTypeFeaturingContext } from "./SysMLv2Parser";
import { DataTypeContext } from "./SysMLv2Parser";
import { ClassContext } from "./SysMLv2Parser";
import { StructureContext } from "./SysMLv2Parser";
import { AssociationContext } from "./SysMLv2Parser";
import { AssociationStructureContext } from "./SysMLv2Parser";
import { ConnectorContext } from "./SysMLv2Parser";
import { ConnectorDeclarationContext } from "./SysMLv2Parser";
import { BinaryConnectorDeclarationContext } from "./SysMLv2Parser";
import { NaryConnectorDeclarationContext } from "./SysMLv2Parser";
import { ConnectorEndMemberContext } from "./SysMLv2Parser";
import { ConnectorEndContext } from "./SysMLv2Parser";
import { OwnedCrossMultiplicityMemberContext } from "./SysMLv2Parser";
import { OwnedCrossMultiplicityContext } from "./SysMLv2Parser";
import { BindingConnectorContext } from "./SysMLv2Parser";
import { BindingConnectorDeclarationContext } from "./SysMLv2Parser";
import { SuccessionContext } from "./SysMLv2Parser";
import { SuccessionDeclarationContext } from "./SysMLv2Parser";
import { BehaviorContext } from "./SysMLv2Parser";
import { StepContext } from "./SysMLv2Parser";
import { FunctionContext } from "./SysMLv2Parser";
import { FunctionBodyContext } from "./SysMLv2Parser";
import { FunctionBodyPartContext } from "./SysMLv2Parser";
import { ReturnFeatureMemberContext } from "./SysMLv2Parser";
import { ResultExpressionMemberContext } from "./SysMLv2Parser";
import { ExpressionContext } from "./SysMLv2Parser";
import { PredicateContext } from "./SysMLv2Parser";
import { BooleanExpressionContext } from "./SysMLv2Parser";
import { InvariantContext } from "./SysMLv2Parser";
import { OwnedExpressionMemberContext } from "./SysMLv2Parser";
import { MetadataReferenceContext } from "./SysMLv2Parser";
import { TypeReferenceMemberContext } from "./SysMLv2Parser";
import { TypeResultMemberContext } from "./SysMLv2Parser";
import { ReferenceTypingContext } from "./SysMLv2Parser";
import { EmptyResultMemberContext } from "./SysMLv2Parser";
import { SequenceOperatorExpressionContext } from "./SysMLv2Parser";
import { SequenceExpressionListMemberContext } from "./SysMLv2Parser";
import { BodyArgumentMemberContext } from "./SysMLv2Parser";
import { BodyArgumentContext } from "./SysMLv2Parser";
import { BodyArgumentValueContext } from "./SysMLv2Parser";
import { FunctionReferenceArgumentMemberContext } from "./SysMLv2Parser";
import { FunctionReferenceArgumentContext } from "./SysMLv2Parser";
import { FunctionReferenceArgumentValueContext } from "./SysMLv2Parser";
import { FunctionReferenceExpressionContext } from "./SysMLv2Parser";
import { FunctionReferenceMemberContext } from "./SysMLv2Parser";
import { FunctionReferenceContext } from "./SysMLv2Parser";
import { FeatureChainMemberContext } from "./SysMLv2Parser";
import { OwnedFeatureChainMemberContext } from "./SysMLv2Parser";
import { FeatureReferenceMemberContext } from "./SysMLv2Parser";
import { FeatureReferenceContext } from "./SysMLv2Parser";
import { ElementReferenceMemberContext } from "./SysMLv2Parser";
import { ConstructorResultMemberContext } from "./SysMLv2Parser";
import { ConstructorResultContext } from "./SysMLv2Parser";
import { InstantiatedTypeMemberContext } from "./SysMLv2Parser";
import { InstantiatedTypeReferenceContext } from "./SysMLv2Parser";
import { NamedArgumentMemberContext } from "./SysMLv2Parser";
import { ParameterRedefinitionContext } from "./SysMLv2Parser";
import { ExpressionBodyMemberContext } from "./SysMLv2Parser";
import { ExpressionBodyContext } from "./SysMLv2Parser";
import { BooleanValueContext } from "./SysMLv2Parser";
import { RealValueContext } from "./SysMLv2Parser";
import { InteractionContext } from "./SysMLv2Parser";
import { FlowContext } from "./SysMLv2Parser";
import { SuccessionFlowContext } from "./SysMLv2Parser";
import { FlowDeclarationContext } from "./SysMLv2Parser";
import { PayloadFeatureMemberContext } from "./SysMLv2Parser";
import { PayloadFeatureContext } from "./SysMLv2Parser";
import { PayloadFeatureSpecializationPartContext } from "./SysMLv2Parser";
import { FlowEndMemberContext } from "./SysMLv2Parser";
import { FlowEndContext } from "./SysMLv2Parser";
import { FlowFeatureMemberContext } from "./SysMLv2Parser";
import { FlowFeatureContext } from "./SysMLv2Parser";
import { FlowFeatureRedefinitionContext } from "./SysMLv2Parser";
import { ValuePartContext } from "./SysMLv2Parser";
import { FeatureValueContext } from "./SysMLv2Parser";
import { MultiplicityContext } from "./SysMLv2Parser";
import { MultiplicitySubsetContext } from "./SysMLv2Parser";
import { MultiplicityRangeContext } from "./SysMLv2Parser";
import { OwnedMultiplicityContext } from "./SysMLv2Parser";
import { OwnedMultiplicityRangeContext } from "./SysMLv2Parser";
import { MultiplicityBoundsContext } from "./SysMLv2Parser";
import { MultiplicityExpressionMemberContext } from "./SysMLv2Parser";
import { MetaclassContext } from "./SysMLv2Parser";
import { PrefixMetadataAnnotationContext } from "./SysMLv2Parser";
import { PrefixMetadataMemberContext } from "./SysMLv2Parser";
import { PrefixMetadataFeatureContext } from "./SysMLv2Parser";
import { MetadataFeatureContext } from "./SysMLv2Parser";
import { MetadataFeatureDeclarationContext } from "./SysMLv2Parser";
import { MetadataBodyContext } from "./SysMLv2Parser";
import { MetadataBodyElementContext } from "./SysMLv2Parser";
import { MetadataBodyFeatureMemberContext } from "./SysMLv2Parser";
import { MetadataBodyFeatureContext } from "./SysMLv2Parser";
import { PackageContext } from "./SysMLv2Parser";
import { LibraryPackageContext } from "./SysMLv2Parser";
import { PackageDeclarationContext } from "./SysMLv2Parser";
import { PackageBodyContext } from "./SysMLv2Parser";
import { ElementFilterMemberContext } from "./SysMLv2Parser";
import { DependencyDeclarationContext } from "./SysMLv2Parser";
import { AnnotatingMemberContext } from "./SysMLv2Parser";
import { PackageBodyElementContext } from "./SysMLv2Parser";
import { PackageMemberContext } from "./SysMLv2Parser";
import { DefinitionElementContext } from "./SysMLv2Parser";
import { UsageElementContext } from "./SysMLv2Parser";
import { BasicDefinitionPrefixContext } from "./SysMLv2Parser";
import { DefinitionExtensionKeywordContext } from "./SysMLv2Parser";
import { DefinitionPrefixContext } from "./SysMLv2Parser";
import { DefinitionContext } from "./SysMLv2Parser";
import { DefinitionDeclarationContext } from "./SysMLv2Parser";
import { DefinitionBodyContext } from "./SysMLv2Parser";
import { DefinitionBodyItemContext } from "./SysMLv2Parser";
import { DefinitionBodyItemContentContext } from "./SysMLv2Parser";
import { DefinitionMemberContext } from "./SysMLv2Parser";
import { VariantUsageMemberContext } from "./SysMLv2Parser";
import { NonOccurrenceUsageMemberContext } from "./SysMLv2Parser";
import { OccurrenceUsageMemberContext } from "./SysMLv2Parser";
import { StructureUsageMemberContext } from "./SysMLv2Parser";
import { BehaviorUsageMemberContext } from "./SysMLv2Parser";
import { RefPrefixContext } from "./SysMLv2Parser";
import { BasicUsagePrefixContext } from "./SysMLv2Parser";
import { EndUsagePrefixContext } from "./SysMLv2Parser";
import { UsageExtensionKeywordContext } from "./SysMLv2Parser";
import { UnextendedUsagePrefixContext } from "./SysMLv2Parser";
import { UsagePrefixContext } from "./SysMLv2Parser";
import { UsageContext } from "./SysMLv2Parser";
import { UsageDeclarationContext } from "./SysMLv2Parser";
import { UsageCompletionContext } from "./SysMLv2Parser";
import { UsageBodyContext } from "./SysMLv2Parser";
import { DefaultReferenceUsageContext } from "./SysMLv2Parser";
import { ReferenceUsageContext } from "./SysMLv2Parser";
import { EndFeatureUsageContext } from "./SysMLv2Parser";
import { VariantReferenceContext } from "./SysMLv2Parser";
import { NonOccurrenceUsageElementContext } from "./SysMLv2Parser";
import { OccurrenceUsageElementContext } from "./SysMLv2Parser";
import { StructureUsageElementContext } from "./SysMLv2Parser";
import { BehaviorUsageElementContext } from "./SysMLv2Parser";
import { VariantUsageElementContext } from "./SysMLv2Parser";
import { SubclassificationPartContext } from "./SysMLv2Parser";
import { AttributeDefinitionContext } from "./SysMLv2Parser";
import { AttributeUsageContext } from "./SysMLv2Parser";
import { EnumerationDefinitionContext } from "./SysMLv2Parser";
import { EnumerationBodyContext } from "./SysMLv2Parser";
import { EnumerationUsageMemberContext } from "./SysMLv2Parser";
import { EnumeratedValueContext } from "./SysMLv2Parser";
import { EnumerationUsageContext } from "./SysMLv2Parser";
import { OccurrenceDefinitionPrefixContext } from "./SysMLv2Parser";
import { OccurrenceDefinitionContext } from "./SysMLv2Parser";
import { IndividualDefinitionContext } from "./SysMLv2Parser";
import { EmptyMultiplicityMemberContext } from "./SysMLv2Parser";
import { OccurrenceUsagePrefixContext } from "./SysMLv2Parser";
import { OccurrenceUsageContext } from "./SysMLv2Parser";
import { IndividualUsageContext } from "./SysMLv2Parser";
import { PortionUsageContext } from "./SysMLv2Parser";
import { PortionKindContext } from "./SysMLv2Parser";
import { EventOccurrenceUsageContext } from "./SysMLv2Parser";
import { SourceSuccessionMemberContext } from "./SysMLv2Parser";
import { SourceSuccessionContext } from "./SysMLv2Parser";
import { SourceEndMemberContext } from "./SysMLv2Parser";
import { SourceEndContext } from "./SysMLv2Parser";
import { ItemDefinitionContext } from "./SysMLv2Parser";
import { ItemUsageContext } from "./SysMLv2Parser";
import { PartDefinitionContext } from "./SysMLv2Parser";
import { PartUsageContext } from "./SysMLv2Parser";
import { PortDefinitionContext } from "./SysMLv2Parser";
import { ConjugatedPortDefinitionMemberContext } from "./SysMLv2Parser";
import { ConjugatedPortDefinitionContext } from "./SysMLv2Parser";
import { PortUsageContext } from "./SysMLv2Parser";
import { ConjugatedPortTypingContext } from "./SysMLv2Parser";
import { ConnectionDefinitionContext } from "./SysMLv2Parser";
import { ConnectionUsageContext } from "./SysMLv2Parser";
import { ConnectorPartContext } from "./SysMLv2Parser";
import { BinaryConnectorPartContext } from "./SysMLv2Parser";
import { NaryConnectorPartContext } from "./SysMLv2Parser";
import { BindingConnectorAsUsageContext } from "./SysMLv2Parser";
import { SuccessionAsUsageContext } from "./SysMLv2Parser";
import { InterfaceDefinitionContext } from "./SysMLv2Parser";
import { InterfaceBodyContext } from "./SysMLv2Parser";
import { InterfaceBodyItemContext } from "./SysMLv2Parser";
import { InterfaceNonOccurrenceUsageMemberContext } from "./SysMLv2Parser";
import { InterfaceNonOccurrenceUsageElementContext } from "./SysMLv2Parser";
import { InterfaceOccurrenceUsageMemberContext } from "./SysMLv2Parser";
import { InterfaceOccurrenceUsageElementContext } from "./SysMLv2Parser";
import { DefaultInterfaceEndContext } from "./SysMLv2Parser";
import { InterfaceUsageContext } from "./SysMLv2Parser";
import { InterfaceUsageDeclarationContext } from "./SysMLv2Parser";
import { InterfacePartContext } from "./SysMLv2Parser";
import { BinaryInterfacePartContext } from "./SysMLv2Parser";
import { NaryInterfacePartContext } from "./SysMLv2Parser";
import { InterfaceEndMemberContext } from "./SysMLv2Parser";
import { InterfaceEndContext } from "./SysMLv2Parser";
import { AllocationDefinitionContext } from "./SysMLv2Parser";
import { AllocationUsageContext } from "./SysMLv2Parser";
import { AllocationUsageDeclarationContext } from "./SysMLv2Parser";
import { FlowDefinitionContext } from "./SysMLv2Parser";
import { MessageContext } from "./SysMLv2Parser";
import { MessageDeclarationContext } from "./SysMLv2Parser";
import { MessageEventMemberContext } from "./SysMLv2Parser";
import { MessageEventContext } from "./SysMLv2Parser";
import { FlowUsageContext } from "./SysMLv2Parser";
import { SuccessionFlowUsageContext } from "./SysMLv2Parser";
import { FlowPayloadFeatureMemberContext } from "./SysMLv2Parser";
import { FlowPayloadFeatureContext } from "./SysMLv2Parser";
import { FlowEndSubsettingContext } from "./SysMLv2Parser";
import { FeatureChainPrefixContext } from "./SysMLv2Parser";
import { ActionDefinitionContext } from "./SysMLv2Parser";
import { ActionBodyContext } from "./SysMLv2Parser";
import { ActionBodyItemContext } from "./SysMLv2Parser";
import { NonBehaviorBodyItemContext } from "./SysMLv2Parser";
import { ActionBehaviorMemberContext } from "./SysMLv2Parser";
import { InitialNodeMemberContext } from "./SysMLv2Parser";
import { ActionNodeMemberContext } from "./SysMLv2Parser";
import { ActionTargetSuccessionMemberContext } from "./SysMLv2Parser";
import { GuardedSuccessionMemberContext } from "./SysMLv2Parser";
import { ActionUsageContext } from "./SysMLv2Parser";
import { ActionUsageDeclarationContext } from "./SysMLv2Parser";
import { PerformActionUsageContext } from "./SysMLv2Parser";
import { PerformActionUsageDeclarationContext } from "./SysMLv2Parser";
import { ActionNodeContext } from "./SysMLv2Parser";
import { ActionNodeUsageDeclarationContext } from "./SysMLv2Parser";
import { ActionNodePrefixContext } from "./SysMLv2Parser";
import { ControlNodeContext } from "./SysMLv2Parser";
import { ControlNodePrefixContext } from "./SysMLv2Parser";
import { MergeNodeContext } from "./SysMLv2Parser";
import { DecisionNodeContext } from "./SysMLv2Parser";
import { JoinNodeContext } from "./SysMLv2Parser";
import { ForkNodeContext } from "./SysMLv2Parser";
import { AcceptNodeContext } from "./SysMLv2Parser";
import { AcceptNodeDeclarationContext } from "./SysMLv2Parser";
import { AcceptParameterPartContext } from "./SysMLv2Parser";
import { PayloadParameterMemberContext } from "./SysMLv2Parser";
import { PayloadParameterContext } from "./SysMLv2Parser";
import { TriggerValuePartContext } from "./SysMLv2Parser";
import { TriggerFeatureValueContext } from "./SysMLv2Parser";
import { TriggerExpressionContext } from "./SysMLv2Parser";
import { SendNodeContext } from "./SysMLv2Parser";
import { SendNodeDeclarationContext } from "./SysMLv2Parser";
import { SenderReceiverPartContext } from "./SysMLv2Parser";
import { NodeParameterMemberContext } from "./SysMLv2Parser";
import { NodeParameterContext } from "./SysMLv2Parser";
import { FeatureBindingContext } from "./SysMLv2Parser";
import { EmptyParameterMemberContext } from "./SysMLv2Parser";
import { AssignmentNodeContext } from "./SysMLv2Parser";
import { AssignmentNodeDeclarationContext } from "./SysMLv2Parser";
import { AssignmentTargetMemberContext } from "./SysMLv2Parser";
import { AssignmentTargetParameterContext } from "./SysMLv2Parser";
import { AssignmentTargetBindingContext } from "./SysMLv2Parser";
import { TerminateNodeContext } from "./SysMLv2Parser";
import { IfNodeContext } from "./SysMLv2Parser";
import { ExpressionParameterMemberContext } from "./SysMLv2Parser";
import { ActionBodyParameterMemberContext } from "./SysMLv2Parser";
import { ActionBodyParameterContext } from "./SysMLv2Parser";
import { IfNodeParameterMemberContext } from "./SysMLv2Parser";
import { WhileLoopNodeContext } from "./SysMLv2Parser";
import { ForLoopNodeContext } from "./SysMLv2Parser";
import { ForVariableDeclarationMemberContext } from "./SysMLv2Parser";
import { ForVariableDeclarationContext } from "./SysMLv2Parser";
import { ActionTargetSuccessionContext } from "./SysMLv2Parser";
import { TargetSuccessionContext } from "./SysMLv2Parser";
import { GuardedTargetSuccessionContext } from "./SysMLv2Parser";
import { DefaultTargetSuccessionContext } from "./SysMLv2Parser";
import { GuardedSuccessionContext } from "./SysMLv2Parser";
import { StateDefinitionContext } from "./SysMLv2Parser";
import { StateDefBodyContext } from "./SysMLv2Parser";
import { StateBodyItemContext } from "./SysMLv2Parser";
import { EntryActionMemberContext } from "./SysMLv2Parser";
import { DoActionMemberContext } from "./SysMLv2Parser";
import { ExitActionMemberContext } from "./SysMLv2Parser";
import { EntryTransitionMemberContext } from "./SysMLv2Parser";
import { StateActionUsageContext } from "./SysMLv2Parser";
import { StatePerformActionUsageContext } from "./SysMLv2Parser";
import { StateAcceptActionUsageContext } from "./SysMLv2Parser";
import { StateSendActionUsageContext } from "./SysMLv2Parser";
import { StateAssignmentActionUsageContext } from "./SysMLv2Parser";
import { TransitionUsageMemberContext } from "./SysMLv2Parser";
import { TargetTransitionUsageMemberContext } from "./SysMLv2Parser";
import { StateUsageContext } from "./SysMLv2Parser";
import { StateUsageBodyContext } from "./SysMLv2Parser";
import { ExhibitStateUsageContext } from "./SysMLv2Parser";
import { TransitionUsageContext } from "./SysMLv2Parser";
import { TargetTransitionUsageContext } from "./SysMLv2Parser";
import { TriggerActionMemberContext } from "./SysMLv2Parser";
import { TriggerActionContext } from "./SysMLv2Parser";
import { GuardExpressionMemberContext } from "./SysMLv2Parser";
import { EffectBehaviorMemberContext } from "./SysMLv2Parser";
import { EffectBehaviorUsageContext } from "./SysMLv2Parser";
import { TransitionPerformActionUsageContext } from "./SysMLv2Parser";
import { TransitionAcceptActionUsageContext } from "./SysMLv2Parser";
import { TransitionSendActionUsageContext } from "./SysMLv2Parser";
import { TransitionAssignmentActionUsageContext } from "./SysMLv2Parser";
import { TransitionSuccessionMemberContext } from "./SysMLv2Parser";
import { TransitionSuccessionContext } from "./SysMLv2Parser";
import { EmptyEndMemberContext } from "./SysMLv2Parser";
import { CalculationDefinitionContext } from "./SysMLv2Parser";
import { CalculationUsageContext } from "./SysMLv2Parser";
import { CalculationBodyContext } from "./SysMLv2Parser";
import { CalculationBodyPartContext } from "./SysMLv2Parser";
import { CalculationBodyItemContext } from "./SysMLv2Parser";
import { ReturnParameterMemberContext } from "./SysMLv2Parser";
import { ConstraintDefinitionContext } from "./SysMLv2Parser";
import { ConstraintUsageContext } from "./SysMLv2Parser";
import { AssertConstraintUsageContext } from "./SysMLv2Parser";
import { ConstraintUsageDeclarationContext } from "./SysMLv2Parser";
import { RequirementDefinitionContext } from "./SysMLv2Parser";
import { RequirementBodyContext } from "./SysMLv2Parser";
import { RequirementBodyItemContext } from "./SysMLv2Parser";
import { SubjectMemberContext } from "./SysMLv2Parser";
import { SubjectUsageContext } from "./SysMLv2Parser";
import { RequirementConstraintMemberContext } from "./SysMLv2Parser";
import { RequirementKindContext } from "./SysMLv2Parser";
import { RequirementConstraintUsageContext } from "./SysMLv2Parser";
import { FramedConcernMemberContext } from "./SysMLv2Parser";
import { FramedConcernUsageContext } from "./SysMLv2Parser";
import { ActorMemberContext } from "./SysMLv2Parser";
import { ActorUsageContext } from "./SysMLv2Parser";
import { StakeholderMemberContext } from "./SysMLv2Parser";
import { StakeholderUsageContext } from "./SysMLv2Parser";
import { RequirementUsageContext } from "./SysMLv2Parser";
import { SatisfyRequirementUsageContext } from "./SysMLv2Parser";
import { SatisfactionSubjectMemberContext } from "./SysMLv2Parser";
import { SatisfactionParameterContext } from "./SysMLv2Parser";
import { SatisfactionFeatureValueContext } from "./SysMLv2Parser";
import { SatisfactionReferenceExpressionContext } from "./SysMLv2Parser";
import { ConcernDefinitionContext } from "./SysMLv2Parser";
import { ConcernUsageContext } from "./SysMLv2Parser";
import { CaseDefinitionContext } from "./SysMLv2Parser";
import { CaseUsageContext } from "./SysMLv2Parser";
import { CaseBodyContext } from "./SysMLv2Parser";
import { CaseBodyItemContext } from "./SysMLv2Parser";
import { ObjectiveMemberContext } from "./SysMLv2Parser";
import { ObjectiveRequirementUsageContext } from "./SysMLv2Parser";
import { AnalysisCaseDefinitionContext } from "./SysMLv2Parser";
import { AnalysisCaseUsageContext } from "./SysMLv2Parser";
import { VerificationCaseDefinitionContext } from "./SysMLv2Parser";
import { VerificationCaseUsageContext } from "./SysMLv2Parser";
import { RequirementVerificationMemberContext } from "./SysMLv2Parser";
import { RequirementVerificationUsageContext } from "./SysMLv2Parser";
import { UseCaseDefinitionContext } from "./SysMLv2Parser";
import { UseCaseUsageContext } from "./SysMLv2Parser";
import { IncludeUseCaseUsageContext } from "./SysMLv2Parser";
import { ViewDefinitionContext } from "./SysMLv2Parser";
import { ViewDefinitionBodyContext } from "./SysMLv2Parser";
import { ViewDefinitionBodyItemContext } from "./SysMLv2Parser";
import { ViewRenderingMemberContext } from "./SysMLv2Parser";
import { ViewRenderingUsageContext } from "./SysMLv2Parser";
import { ViewUsageContext } from "./SysMLv2Parser";
import { ViewBodyContext } from "./SysMLv2Parser";
import { ViewBodyItemContext } from "./SysMLv2Parser";
import { ExposeContext } from "./SysMLv2Parser";
import { MembershipExposeContext } from "./SysMLv2Parser";
import { NamespaceExposeContext } from "./SysMLv2Parser";
import { ViewpointDefinitionContext } from "./SysMLv2Parser";
import { ViewpointUsageContext } from "./SysMLv2Parser";
import { RenderingDefinitionContext } from "./SysMLv2Parser";
import { RenderingUsageContext } from "./SysMLv2Parser";
import { MetadataDefinitionContext } from "./SysMLv2Parser";
import { PrefixMetadataUsageContext } from "./SysMLv2Parser";
import { MetadataUsageContext } from "./SysMLv2Parser";
import { MetadataUsageDeclarationContext } from "./SysMLv2Parser";
import { MetadataBodyUsageMemberContext } from "./SysMLv2Parser";
import { MetadataBodyUsageContext } from "./SysMLv2Parser";
import { ExtendedDefinitionContext } from "./SysMLv2Parser";
import { ExtendedUsageContext } from "./SysMLv2Parser";
import { FilterPackageImportDeclarationContext } from "./SysMLv2Parser";
import { NamespaceImportDirectContext } from "./SysMLv2Parser";
import { CalculationUsageDeclarationContext } from "./SysMLv2Parser";
import { EmptyActionUsage_Context } from "./SysMLv2Parser";
import { EmptyFeature_Context } from "./SysMLv2Parser";
import { EmptyMultiplicity_Context } from "./SysMLv2Parser";
import { EmptyUsage_Context } from "./SysMLv2Parser";
import { FilterPackageImportContext } from "./SysMLv2Parser";
import { NonFeatureChainPrimaryExpressionContext } from "./SysMLv2Parser";
import { PortConjugationContext } from "./SysMLv2Parser";

/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `SysMLv2Parser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export class SysMLv2ParserVisitor<Result> extends ParseTreeVisitor<Result> {
    [key: string]: any;
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
}

